import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  MAX_SOURCE_ITEMS,
  MAX_TMDB_CONCURRENCY,
  MEDIA_CACHE_TTL_MS,
  REFRESH_MOVIE_DNA_OPTIONS,
  TMDB_PROXY_MAX_RESPONSE_BYTES,
  TMDB_PROXY_OPTIONS,
} from '../src/config.js'
import { MovieDnaServerError, SERVER_ERROR_CODES, safeErrorCode } from '../src/errors.js'
import { createHandlers } from '../src/handlers/createHandlers.js'
import { createMetadataResolver } from '../src/metadata/metadataCache.js'
import { normalizeMovieMetadata, normalizeTvMetadata } from '../src/metadata/normalizeTmdbMetadata.js'
import { createTmdbClient } from '../src/metadata/tmdbClient.js'
import { createRecalculationRunner } from '../src/runner/recalculationRunner.js'
import { collectDnaSources } from '../src/sources/collectSources.js'

const profile = { username: 'synthetic', displayName: 'Synthetic User', onboardingCompleted: true }
const complete = { genres: true, releaseYear: true, originalLanguage: true, countries: true, people: true }

function sourceSnapshot(overrides = {}) {
  return {
    uid: 'synthetic-user',
    profile,
    ratings: [],
    onboardingResponses: [],
    savedMedia: [],
    onboardingSummary: { version: 1, userId: 'synthetic-user', status: 'completed' },
    ...overrides,
  }
}

function rating(id, score = 8, mediaType = 'movie') {
  return { id: `${mediaType}_${id}`, tmdbId: id, mediaType, score }
}

function cached(id, mediaType = 'movie') {
  return {
    schemaVersion: 1,
    tmdbId: id,
    mediaType,
    genreIds: [28],
    releaseYear: 2020,
    originalLanguage: 'en',
    countryCodes: ['US'],
    directors: mediaType === 'movie' ? [{ id: 2, name: 'Director' }] : [],
    creators: mediaType === 'tv' ? [{ id: 3, name: 'Creator' }] : [],
    actors: [{ id: 4, name: 'Actor', billingOrder: 0 }],
    metadataStatus: 'ready',
    metadataCompleteness: complete,
    fetchedAt: 100,
    expiresAt: 10_000,
  }
}

function response(status, body = {}, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => structuredClone(body),
  }
}

it('uses bounded App Check proxy runtime settings without CORS', () => {
  assert.deepEqual(TMDB_PROXY_OPTIONS, {
    region: 'europe-west6', memory: '512MiB', timeoutSeconds: 30,
    minInstances: 0, maxInstances: 4, concurrency: 10, cors: false,
  })
  assert.equal(TMDB_PROXY_MAX_RESPONSE_BYTES, 2 * 1024 * 1024)
})

describe('source collection and merge', () => {
  it('applies rating over onboarding over Favorite', () => {
    const items = collectDnaSources(sourceSnapshot({
      ratings: [rating(1, 5)],
      onboardingResponses: [{ id: '1', tmdbId: 1, mediaType: 'movie', reaction: 'like' }],
      savedMedia: [{ id: 'movie_1', tmdbId: 1, mediaType: 'movie', favorite: true }],
    }))
    assert.deepEqual(items[0], {
      mediaKey: 'movie_1', tmdbId: 1, mediaType: 'movie', rating: 5,
      onboardingReaction: 'like', favorite: true, metadata: null,
    })
  })

  it('accepts canonical movie and TV onboarding identities', () => {
    const items = collectDnaSources(sourceSnapshot({
      onboardingResponses: [
        {
          id: 'movie_6',
          tmdbId: 6,
          mediaType: 'movie',
          reaction: 'like',
        },
        {
          id: 'tv_6',
          tmdbId: 6,
          mediaType: 'tv',
          reaction: 'dislike',
        },
      ],
    }))

    assert.deepEqual(
      items.map((item) => ({
        mediaKey: item.mediaKey,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        onboardingReaction: item.onboardingReaction,
      })),
      [
        {
          mediaKey: 'movie_6',
          tmdbId: 6,
          mediaType: 'movie',
          onboardingReaction: 'like',
        },
        {
          mediaKey: 'tv_6',
          tmdbId: 6,
          mediaType: 'tv',
          onboardingReaction: 'dislike',
        },
      ],
    )
  })

  it('rejects duplicate legacy and canonical onboarding identities', () => {
    assert.throws(
      () => collectDnaSources(sourceSnapshot({
        onboardingResponses: [
          {
            id: '7',
            tmdbId: 7,
            mediaType: 'movie',
            reaction: 'like',
          },
          {
            id: 'movie_7',
            tmdbId: 7,
            mediaType: 'movie',
            reaction: 'dislike',
          },
        ],
      })),
      (error) => (
        error.code === SERVER_ERROR_CODES.INVALID_SOURCE
      ),
    )
  })

  it('rejects canonical onboarding identity mismatches', () => {
    assert.throws(
      () => collectDnaSources(sourceSnapshot({
        onboardingResponses: [{
          id: 'tv_8',
          tmdbId: 8,
          mediaType: 'movie',
          reaction: 'like',
        }],
      })),
      (error) => (
        error.code === SERVER_ERROR_CODES.INVALID_SOURCE
      ),
    )
  })

  it('keeps skip plus Favorite so core can apply Favorite fallback', () => {
    const [item] = collectDnaSources(sourceSnapshot({
      onboardingResponses: [{ id: '2', tmdbId: 2, mediaType: 'movie', reaction: 'skip' }],
      savedMedia: [{ id: 'movie_2', tmdbId: 2, mediaType: 'movie', favorite: true }],
    }))
    assert.equal(item.onboardingReaction, 'skip')
    assert.equal(item.favorite, true)
  })

  it('ignores Watchlist and custom-list-only saved media', () => {
    assert.deepEqual(collectDnaSources(sourceSnapshot({
      savedMedia: [{ id: 'movie_3', tmdbId: 3, mediaType: 'movie', favorite: false, watchlist: true, listIds: ['x'] }],
    })), [])
  })

  it('allows incomplete onboarding but rejects malformed onboarding state', () => {
    assert.deepEqual(
      collectDnaSources(
        sourceSnapshot({
          profile: {
            ...profile,
            onboardingCompleted: false,
          },
        }),
      ),
      [],
    )

    assert.throws(
      () => collectDnaSources(
        sourceSnapshot({
          profile: {
            ...profile,
            onboardingCompleted: 'false',
          },
        }),
      ),
      (error) =>
        error.code === SERVER_ERROR_CODES.INVALID_PROFILE,
    )
  })

  it('rejects malformed identity and rating', () => {
    assert.throws(() => collectDnaSources(sourceSnapshot({ ratings: [{ ...rating(4), tmdbId: 5 }] })))
    assert.throws(() => collectDnaSources(sourceSnapshot({ ratings: [rating(4, 11)] })))
  })

  it('rejects duplicate source documents', () => {
    assert.throws(() => collectDnaSources(sourceSnapshot({ ratings: [rating(5), rating(5)] })))
  })

  it('rejects the maximum source limit', () => {
    const ratings = Array.from({ length: MAX_SOURCE_ITEMS + 1 }, (_, index) => rating(index + 1))
    assert.throws(() => collectDnaSources(sourceSnapshot({ ratings })),
      (error) => error.code === SERVER_ERROR_CODES.SOURCE_LIMIT_EXCEEDED)
  })
})

describe('TMDB normalization and client', () => {
  const moviePayload = {
    id: 10,
    genres: [{ id: 28 }, { id: 28 }, { id: null }],
    release_date: '2020-01-02',
    original_language: 'en',
    production_countries: [{ iso_3166_1: 'US' }, { iso_3166_1: 'US' }],
    credits: {
      crew: [{ id: 2, name: 'Director', job: 'Director' }, { id: 2, name: 'Director', job: 'Director' }],
      cast: Array.from({ length: 5 }, (_, order) => ({ id: order + 20, name: `Actor ${order}`, order })),
    },
  }

  it('normalizes a minimal movie and top-three actors', () => {
    const metadata = normalizeMovieMetadata(moviePayload)
    assert.deepEqual(metadata.genreIds, [28])
    assert.deepEqual(metadata.countryCodes, ['US'])
    assert.equal(metadata.directors.length, 1)
    assert.equal(metadata.creators.length, 0)
    assert.equal(metadata.actors.length, 3)
  })

  it('normalizes TV creators and aggregate cast', () => {
    const metadata = normalizeTvMetadata({
      ...moviePayload, id: 11, first_air_date: '2019-01-01',
      created_by: [{ id: 7, name: 'Creator' }],
      aggregate_credits: { cast: moviePayload.credits.cast },
    })
    assert.equal(metadata.mediaType, 'tv')
    assert.equal(metadata.directors.length, 0)
    assert.equal(metadata.creators[0].id, 7)
    assert.equal(metadata.actors.length, 3)
  })

  it('uses a fixed host, Bearer header and exact path', async () => {
    let request
    const client = createTmdbClient({ token: 'synthetic-token', fetchImpl: async (...args) => {
      request = args
      return response(200, moviePayload)
    } })
    await client.getMetadata('movie', 10)
    assert.equal(request[0].origin, 'https://api.themoviedb.org')
    assert.equal(request[0].pathname, '/3/movie/10')
    assert.equal(request[1].headers.Authorization, 'Bearer synthetic-token')
  })

  it('maps 404 to unavailable metadata', async () => {
    const client = createTmdbClient({ token: 'synthetic', fetchImpl: async () => response(404) })
    assert.equal(await client.getMetadata('movie', 10), null)
  })

  it('rejects a successful payload whose identity does not match the request', async () => {
    const client = createTmdbClient({
      token: 'synthetic',
      fetchImpl: async () => response(200, { ...moviePayload, id: 999 }),
    })
    await assert.rejects(
      client.getMetadata('movie', 10),
      (error) => error.code === SERVER_ERROR_CODES.INVALID_METADATA,
    )
  })

  it('honors Retry-After for 429 and limits retries', async () => {
    const delays = []
    let calls = 0
    const client = createTmdbClient({
      token: 'synthetic', retries: 2,
      sleep: async (delay) => delays.push(delay),
      fetchImpl: async () => { calls += 1; return response(429, {}, { 'retry-after': '2' }) },
    })
    await assert.rejects(client.getMetadata('movie', 10), (error) => error.code === SERVER_ERROR_CODES.RATE_LIMITED)
    assert.equal(calls, 3)
    assert.deepEqual(delays, [2000, 2000])
  })

  it('maps AbortError to a safe timeout without token leakage', async () => {
    const client = createTmdbClient({
      token: 'private-synthetic-token', timeoutMs: 1, retries: 0,
      fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }),
    })
    await assert.rejects(client.getMetadata('movie', 10), (error) => {
      assert.equal(error.code, SERVER_ERROR_CODES.TIMEOUT)
      assert.equal(error.message.includes('private-synthetic-token'), false)
      return true
    })
  })

  it('retries transient network failures only to the configured limit', async () => {
    let calls = 0
    const client = createTmdbClient({
      token: 'synthetic', retries: 1, sleep: async () => {},
      fetchImpl: async () => { calls += 1; throw new Error('upstream body') },
    })
    await assert.rejects(client.getMetadata('tv', 11), (error) => error.code === SERVER_ERROR_CODES.TMDB_UNAVAILABLE)
    assert.equal(calls, 2)
  })
})

describe('metadata cache', () => {
  it('uses a fresh cache without TMDB', async () => {
    let requests = 0
    const resolver = createMetadataResolver({
      now: () => 1000,
      cache: { get: async () => cached(1), set: async () => assert.fail('must not write') },
      tmdbClient: { getMetadata: async () => { requests += 1 } },
    })
    const [item] = await resolver.resolve([{ mediaKey: 'movie_1', tmdbId: 1, mediaType: 'movie' }])
    assert.equal(item.metadata.status, 'ready')
    assert.equal(requests, 0)
  })

  it('refreshes expired cache and writes minimal metadata', async () => {
    let written
    const resolver = createMetadataResolver({
      now: () => 20_000,
      cache: { get: async () => cached(2), set: async (_key, value) => { written = value } },
      tmdbClient: { getMetadata: async () => cached(2) },
    })
    await resolver.resolve([{ mediaKey: 'movie_2', tmdbId: 2, mediaType: 'movie' }])
    assert.equal(written.tmdbId, 2)
    assert.equal('overview' in written, false)
    assert.equal(written.expiresAt - written.fetchedAt, MEDIA_CACHE_TTL_MS)
  })

  it('keeps upstream data from controlling server cache timestamps', async () => {
    let written
    const resolver = createMetadataResolver({
      now: () => 50_000,
      cache: { get: async () => null, set: async (_key, value) => { written = value } },
      tmdbClient: {
        getMetadata: async () => ({
          ...cached(6),
          fetchedAt: 1,
          expiresAt: Number.MAX_SAFE_INTEGER,
        }),
      },
    })
    await resolver.resolve([{ mediaKey: 'movie_6', tmdbId: 6, mediaType: 'movie' }])
    assert.equal(written.fetchedAt, 50_000)
    assert.equal(written.expiresAt, 50_000 + MEDIA_CACHE_TTL_MS)
  })

  it('refreshes corrupted identity instead of trusting it', async () => {
    let requests = 0
    const resolver = createMetadataResolver({
      now: () => 100,
      cache: { get: async () => cached(99), set: async () => {} },
      tmdbClient: { getMetadata: async () => { requests += 1; return cached(3) } },
    })
    await resolver.resolve([{ mediaKey: 'movie_3', tmdbId: 3, mediaType: 'movie' }])
    assert.equal(requests, 1)
  })

  it('does not return an expired compatible cache on transient failure', async () => {
    const resolver = createMetadataResolver({
      now: () => 20_000,
      cache: { get: async () => cached(4), set: async () => assert.fail('must not overwrite') },
      tmdbClient: { getMetadata: async () => { throw new MovieDnaServerError(SERVER_ERROR_CODES.TIMEOUT) } },
    })
    await assert.rejects(
      resolver.resolve([{ mediaKey: 'movie_4', tmdbId: 4, mediaType: 'movie' }]),
      (error) => error.code === SERVER_ERROR_CODES.TIMEOUT,
    )
  })

  it('treats missing and malformed expiry values as cache misses', async () => {
    for (const expiresAt of [undefined, null, 'tomorrow', Number.NaN]) {
      let requests = 0
      const resolver = createMetadataResolver({
        now: () => 100,
        cache: {
          get: async () => ({ ...cached(5), expiresAt }),
          set: async () => {},
        },
        tmdbClient: { getMetadata: async () => { requests += 1; return cached(5) } },
      })
      await resolver.resolve([{ mediaKey: 'movie_5', tmdbId: 5, mediaType: 'movie' }])
      assert.equal(requests, 1)
    }
  })

  it('limits concurrent metadata requests to four', async () => {
    let active = 0
    let maximum = 0
    const resolver = createMetadataResolver({
      cache: { get: async () => null, set: async () => {} },
      tmdbClient: { getMetadata: async (_type, id) => {
        active += 1
        maximum = Math.max(maximum, active)
        await new Promise((resolve) => setTimeout(resolve, 2))
        active -= 1
        return cached(id)
      } },
    })
    await resolver.resolve(Array.from({ length: 12 }, (_, index) => ({
      mediaKey: `movie_${index + 1}`, tmdbId: index + 1, mediaType: 'movie',
    })))
    assert.equal(maximum, MAX_TMDB_CONCURRENCY)
  })
})

describe('runner idempotency, stale protection and handlers', () => {
  function runnerFixture({ revisions = ['a', 'a'], finish = false, calculationVersion = '1.0.0' } = {}) {
    const calls = { begin: [], finish: [], fail: [] }
    let load = 0
    const store = {
      beginRun: async (...args) => calls.begin.push(args),
      loadSources: async () => ({ snapshot: sourceSnapshot({ ratings: [rating(1)] }), revision: revisions[load++] }),
      finishRun: async (...args) => { calls.finish.push(args); return finish },
      failRun: async (...args) => calls.fail.push(args),
    }
    const runner = createRecalculationRunner({
      store,
      tokenFactory: () => 'run-token',
      metadataResolver: { resolve: async (items) => items.map((item) => ({ ...item, metadata: null })) },
      calculate: async () => ({
        algorithmVersion: calculationVersion,
        inputFingerprint: 'sha256:synthetic', sourceCounts: { uniqueNonZeroUsed: 1 },
        metadataCoverage: 0, overallConfidence: 0.1, dimensions: {},
      }),
    })
    return { runner, calls }
  }

  it('returns unchanged from fingerprint/version no-op decision', async () => {
    const { runner, calls } = runnerFixture({ finish: true })
    assert.equal((await runner('alice')).status, 'unchanged')
    assert.equal(calls.finish.length, 1)
  })

  it('passes algorithm changes through to atomic finalization', async () => {
    const { runner, calls } = runnerFixture({ calculationVersion: '2.0.0' })
    await runner('alice')
    assert.equal(calls.finish[0][2].algorithmVersion, '2.0.0')
  })

  it('rejects stale sources and preserves previous DNA', async () => {
    const { runner, calls } = runnerFixture({ revisions: ['old', 'new'] })
    await assert.rejects(runner('alice'), (error) => error.code === SERVER_ERROR_CODES.STALE_SOURCE)
    assert.equal(calls.finish.length, 0)
    assert.equal(calls.fail[0][2], SERVER_ERROR_CODES.STALE_SOURCE)
  })

  it('rejects unsafe UID path segments before touching Firestore', async () => {
    const { runner, calls } = runnerFixture()
    await assert.rejects(runner('alice/ratings/bob'), (error) => error.code === SERVER_ERROR_CODES.INVALID_PROFILE)
    assert.equal(calls.begin.length, 0)
  })

  it('maps stale completion and internal failures safely', () => {
    assert.equal(safeErrorCode(new MovieDnaServerError(SERVER_ERROR_CODES.STALE_RUN)), SERVER_ERROR_CODES.STALE_RUN)
    assert.equal(safeErrorCode(new Error('secret raw error')), SERVER_ERROR_CODES.INTERNAL)
  })

  it('passes manual mode for cooldown enforcement', async () => {
    const { runner, calls } = runnerFixture()
    await runner('alice', { manual: true })
    assert.deepEqual(calls.begin[0][2], { manual: true })
  })

  it('requires callable authentication and derives UID only from auth', async () => {
    const uids = []
    const handlers = createHandlers(async (uid) => { uids.push(uid); return { status: 'updated' } })
    await assert.rejects(handlers.manualRefresh({ data: { uid: 'mallory' } }), (error) => error.code === 'unauthenticated')
    await handlers.manualRefresh({ auth: { uid: 'alice' }, app: { appId: 'verified-by-platform' }, data: { uid: 'mallory' } })
    assert.deepEqual(uids, ['alice'])
  })

  it('enforces App Check at the callable boundary and in the handler', async () => {
    assert.equal(REFRESH_MOVIE_DNA_OPTIONS.enforceAppCheck, true)
    const handlers = createHandlers(async () => assert.fail('must not recalculate'))
    await assert.rejects(
      handlers.manualRefresh({ auth: { uid: 'alice' } }),
      (error) => error.code === 'failed-precondition' && error.message === 'App verification is required.',
    )
  })

  it('returns a safe callable error without raw internal details', async () => {
    const handlers = createHandlers(async () => { throw new Error('raw token and stack details') })
    await assert.rejects(handlers.manualRefresh({ auth: { uid: 'alice' }, app: { appId: 'verified-by-platform' } }), (error) => {
      assert.equal(error.code, 'internal')
      assert.equal(error.message, 'MovieDNA could not be refreshed.')
      assert.equal(error.message.includes('raw token'), false)
      return true
    })
  })

  it('uses event UID and skips Watchlist-only savedMedia changes', async () => {
    const uids = []
    const handlers = createHandlers(async (uid) => { uids.push(uid) })
    await handlers.sourceWrite({ params: { uid: 'alice' } })
    const snapshot = (data) => ({ data: () => data })
    const result = await handlers.savedMediaWrite({
      params: { uid: 'alice' },
      data: { before: snapshot({ favorite: false, watchlist: false }), after: snapshot({ favorite: false, watchlist: true }) },
    })
    assert.equal(result.status, 'unchanged')
    const customResult = await handlers.savedMediaWrite({
      params: { uid: 'alice' },
      data: { before: snapshot({ favorite: false, listIds: [] }), after: snapshot({ favorite: false, listIds: ['list-1'] }) },
    })
    assert.equal(customResult.status, 'unchanged')
    assert.deepEqual(uids, ['alice'])
  })
})
