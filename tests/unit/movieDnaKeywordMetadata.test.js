import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { calculateMovieDna } from '../../functions/src/dna/core/calculateMovieDna.js'
import { createMetadataResolver } from '../../functions/src/metadata/metadataCache.js'
import {
  normalizeMovieMetadata,
  normalizeTvMetadata,
} from '../../functions/src/metadata/normalizeTmdbMetadata.js'
import { createTmdbClient } from '../../functions/src/metadata/tmdbClient.js'

const complete = {
  genres: true,
  releaseYear: true,
  originalLanguage: true,
  countries: true,
  people: true,
}

function moviePayload(overrides = {}) {
  return {
    id: 1,
    genres: [],
    release_date: '2020-01-01',
    original_language: 'en',
    production_countries: [],
    credits: {
      crew: [],
      cast: [],
    },
    keywords: {
      keywords: [],
    },
    ...overrides,
  }
}

function tvPayload(overrides = {}) {
  return {
    id: 2,
    genres: [],
    first_air_date: '2020-01-01',
    original_language: 'en',
    production_countries: [],
    created_by: [],
    aggregate_credits: {
      cast: [],
    },
    keywords: {
      results: [],
    },
    ...overrides,
  }
}

describe('MovieDNA keyword metadata foundation', () => {
  it('normalizes movie keywords deterministically', () => {
    const normalized = normalizeMovieMetadata(moviePayload({
      keywords: {
        keywords: [
          { id: 20, name: ' Existentialism ' },
          { id: 10, name: 'Artificial   Intelligence' },
          { id: 20, name: 'duplicate is ignored' },
          { id: -1, name: 'bad' },
          { id: 30, name: '   ' },
        ],
      },
    }))

    assert.deepEqual(normalized.keywords, [
      { id: 10, name: 'artificial intelligence' },
      { id: 20, name: 'existentialism' },
    ])
  })

  it('normalizes TV keyword results into the same shape', () => {
    const normalized = normalizeTvMetadata(tvPayload({
      keywords: {
        results: [
          { id: 50, name: 'Serial Killer' },
          { id: 40, name: 'Psychology' },
        ],
      },
    }))

    assert.deepEqual(normalized.keywords, [
      { id: 40, name: 'psychology' },
      { id: 50, name: 'serial killer' },
    ])
  })

  it('requests keywords together with movie and TV credits', async () => {
    const urls = []

    const fetchImpl = async (url) => {
      urls.push(String(url))

      const parsed = new URL(url)
      const isMovie = parsed.pathname.includes('/movie/')

      return {
        ok: true,
        status: 200,
        headers: {
          get: () => null,
        },
        json: async () => (
          isMovie
            ? moviePayload()
            : tvPayload()
        ),
      }
    }

    const client = createTmdbClient({
      token: 'test-token',
      fetchImpl,
      retries: 0,
      timeoutMs: 5_000,
    })

    await client.getMetadata('movie', 1)
    await client.getMetadata('tv', 2)

    assert.equal(
      new URL(urls[0]).searchParams.get('append_to_response'),
      'credits,keywords',
    )

    assert.equal(
      new URL(urls[1]).searchParams.get('append_to_response'),
      'aggregate_credits,keywords',
    )
  })

  it('passes normalized keywords through the metadata cache resolver', async () => {
    const stored = new Map()

    const cache = {
      async get(key) {
        return stored.get(key) ?? null
      },
      async set(key, value) {
        stored.set(key, value)
      },
    }

    const tmdbClient = {
      async getMetadata() {
        return normalizeMovieMetadata(moviePayload({
          keywords: {
            keywords: [
              { id: 1, name: 'Psychology' },
              { id: 2, name: 'Investigation' },
            ],
          },
        }))
      },
    }

    const resolver = createMetadataResolver({
      cache,
      tmdbClient,
      now: () => 1000,
      ttlMs: 10_000,
    })

    const [resolved] = await resolver.resolve([
      {
        mediaKey: 'movie_1',
        tmdbId: 1,
        mediaType: 'movie',
      },
    ])

    assert.deepEqual(resolved.metadata.keywords, [
      { id: 1, name: 'psychology' },
      { id: 2, name: 'investigation' },
    ])

    assert.deepEqual(stored.get('movie_1').keywords, [
      { id: 1, name: 'psychology' },
      { id: 2, name: 'investigation' },
    ])
  })

  it('keeps old valid cache entries without keywords backward compatible', async () => {
    const cached = {
      schemaVersion: 1,
      tmdbId: 3,
      mediaType: 'movie',
      genreIds: [],
      releaseYear: 2020,
      originalLanguage: 'en',
      countryCodes: [],
      directors: [],
      creators: [],
      actors: [],
      collectionId: null,
      metadataStatus: 'ready',
      metadataCompleteness: { ...complete },
      fetchedAt: 500,
      expiresAt: 5000,
    }

    const cache = {
      async get() {
        return cached
      },
      async set() {
        throw new Error('fresh cache entry should not be rewritten')
      },
    }

    const tmdbClient = {
      async getMetadata() {
        throw new Error('fresh cache entry should not refetch')
      },
    }

    const resolver = createMetadataResolver({
      cache,
      tmdbClient,
      now: () => 1000,
      ttlMs: 10_000,
    })

    const [resolved] = await resolver.resolve([
      {
        mediaKey: 'movie_3',
        tmdbId: 3,
        mediaType: 'movie',
      },
    ])

    assert.deepEqual(resolved.metadata.keywords, [])
  })

  it('makes keyword evidence part of the deterministic DNA fingerprint', async () => {
    const base = {
      mediaKey: 'movie_10',
      tmdbId: 10,
      mediaType: 'movie',
      rating: 10,
      onboardingReaction: null,
      favorite: false,
      metadata: {
        status: 'ready',
        genres: [
          { id: 878, label: 'Science Fiction' },
        ],
        keywords: [
          { id: 100, name: 'artificial intelligence' },
        ],
        releaseYear: 2020,
        originalLanguage: {
          code: 'en',
          label: 'English',
        },
        countries: [],
        directors: [],
        creators: [],
        actors: [],
        completeness: { ...complete },
      },
    }

    const first = await calculateMovieDna({
      items: [base],
    })

    const second = await calculateMovieDna({
      items: [{
        ...base,
        metadata: {
          ...base.metadata,
          keywords: [
            { id: 101, name: 'existentialism' },
          ],
        },
      }],
    })

    assert.notEqual(
      first.inputFingerprint,
      second.inputFingerprint,
    )

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        first.dimensions,
        'keywords',
      ),
      false,
    )
  })
})
