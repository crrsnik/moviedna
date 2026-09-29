import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRecommendationTmdbClient } from '../../functions/src/recommendations/tmdb/recommendationTmdbClient.js'
import {
  MovieDnaServerError,
  SERVER_ERROR_CODES,
} from '../../functions/src/errors.js'

function response(
  payload,
  {
    status = 200,
    headers = {},
  } = {},
) {
  return new Response(
    JSON.stringify(payload),
    {
      status,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
    },
  )
}

function createFetch(sequence) {
  const calls = []
  let index = 0

  const fetchImpl = async (...args) => {
    calls.push(args)

    const value = sequence[
      Math.min(index, sequence.length - 1)
    ]

    index += 1

    if (value instanceof Error) throw value
    if (typeof value === 'function') return value(...args)

    return value
  }

  return {
    fetchImpl,
    calls,
  }
}

function expectCode(code) {
  return error => (
    error instanceof MovieDnaServerError
    && error.code === code
  )
}

describe('recommendation TMDB source client', () => {
  it('loads trending movie candidates with server authorization', async () => {
    const { fetchImpl, calls } = createFetch([
      response({
        results: [
          {
            id: 1,
            title: 'Movie',
            popularity: 10,
          },
        ],
      }),
    ])

    const client = createRecommendationTmdbClient({
      token: 'secret-token',
      fetchImpl,
    })

    const result = await client.getTrending('movie')

    assert.deepEqual(result, {
      mediaType: 'movie',
      source: 'trending',
      results: [{
        id: 1,
        title: 'Movie',
        popularity: 10,
      }],
    })

    assert.equal(calls.length, 1)

    const [url, options] = calls[0]

    assert.equal(
      url.toString(),
      'https://api.themoviedb.org/3/trending/movie/day?language=en-US',
    )

    assert.equal(options.method, 'GET')
    assert.equal(
      options.headers.Authorization,
      'Bearer secret-token',
    )
    assert.equal(
      options.headers.Accept,
      'application/json',
    )
    assert.equal(options.redirect, 'error')
  })

  it('loads paginated popular and top-rated sources', async () => {
    const { fetchImpl, calls } = createFetch([
      response({ results: [] }),
      response({ results: [] }),
    ])

    const client = createRecommendationTmdbClient({
      token: 'token',
      fetchImpl,
    })

    assert.deepEqual(
      await client.getPopular('tv', 2),
      {
        mediaType: 'tv',
        source: 'popular:2',
        results: [],
      },
    )

    assert.deepEqual(
      await client.getTopRated('movie', 3),
      {
        mediaType: 'movie',
        source: 'top-rated:3',
        results: [],
      },
    )

    assert.equal(
      calls[0][0].toString(),
      'https://api.themoviedb.org/3/tv/popular?language=en-US&page=2',
    )

    assert.equal(
      calls[1][0].toString(),
      'https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=3',
    )
  })

  it('discovers movie candidates by genre with exact safe filters', async () => {
    const { fetchImpl, calls } = createFetch([
      response({ results: [] }),
    ])

    const client = createRecommendationTmdbClient({
      token: 'token',
      fetchImpl,
    })

    const result = await client.discoverByGenre(
      'movie',
      28,
      4,
    )

    assert.deepEqual(result, {
      mediaType: 'movie',
      source: 'genre:28:4',
      results: [],
    })

    assert.equal(
      calls[0][0].toString(),
      'https://api.themoviedb.org/3/discover/movie?language=en-US&page=4&sort_by=popularity.desc&include_adult=false&with_genres=28&include_video=false',
    )
  })

  it('discovers TV candidates by genre with the TV-specific filter', async () => {
    const { fetchImpl, calls } = createFetch([
      response({ results: [] }),
    ])

    const client = createRecommendationTmdbClient({
      token: 'token',
      fetchImpl,
    })

    await client.discoverByGenre('tv', 18)

    assert.equal(
      calls[0][0].toString(),
      'https://api.themoviedb.org/3/discover/tv?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=18&include_null_first_air_dates=false',
    )
  })

  it('rejects invalid media types, genres and pages before network access', async () => {
    const { fetchImpl, calls } = createFetch([
      response({ results: [] }),
    ])

    const client = createRecommendationTmdbClient({
      token: 'token',
      fetchImpl,
    })

    await assert.rejects(
      client.getTrending('person'),
      expectCode(SERVER_ERROR_CODES.INVALID_SOURCE),
    )

    await assert.rejects(
      client.getPopular('movie', 0),
      expectCode(SERVER_ERROR_CODES.INVALID_SOURCE),
    )

    await assert.rejects(
      client.getTopRated('tv', 501),
      expectCode(SERVER_ERROR_CODES.INVALID_SOURCE),
    )

    await assert.rejects(
      client.discoverByGenre('movie', -1),
      expectCode(SERVER_ERROR_CODES.INVALID_SOURCE),
    )

    assert.equal(calls.length, 0)
  })

  it('retries transient server failures and succeeds', async () => {
    const delays = []

    const { fetchImpl, calls } = createFetch([
      response(
        { error: true },
        { status: 503 },
      ),
      response({
        results: [{
          id: 1,
          title: 'Recovered',
        }],
      }),
    ])

    const client = createRecommendationTmdbClient({
      token: 'token',
      fetchImpl,
      retries: 1,
      sleep: async milliseconds => {
        delays.push(milliseconds)
      },
    })

    const result = await client.getTrending('movie')

    assert.equal(calls.length, 2)
    assert.equal(delays.length, 1)
    assert.equal(result.results[0].title, 'Recovered')
  })

  it('maps exhausted rate limiting to a safe server error', async () => {
    const { fetchImpl } = createFetch([
      response(
        { error: true },
        { status: 429 },
      ),
    ])

    const client = createRecommendationTmdbClient({
      token: 'token',
      fetchImpl,
      retries: 0,
    })

    await assert.rejects(
      client.getTrending('movie'),
      expectCode(SERVER_ERROR_CODES.RATE_LIMITED),
    )
  })

  it('maps exhausted network failures to TMDB unavailable', async () => {
    const { fetchImpl } = createFetch([
      new TypeError('PRIVATE NETWORK DETAILS'),
    ])

    const client = createRecommendationTmdbClient({
      token: 'token',
      fetchImpl,
      retries: 0,
    })

    await assert.rejects(
      client.getTrending('movie'),
      expectCode(SERVER_ERROR_CODES.TMDB_UNAVAILABLE),
    )
  })

  it('rejects malformed successful TMDB payloads safely', async () => {
    const { fetchImpl } = createFetch([
      response({ notResults: [] }),
    ])

    const client = createRecommendationTmdbClient({
      token: 'token',
      fetchImpl,
    })

    await assert.rejects(
      client.getTrending('movie'),
      expectCode(SERVER_ERROR_CODES.TMDB_UNAVAILABLE),
    )
  })

  it('requires a token and fetch implementation', () => {
    assert.throws(
      () => createRecommendationTmdbClient({
        token: '',
      }),
      expectCode(SERVER_ERROR_CODES.TMDB_UNAVAILABLE),
    )

    assert.throws(
      () => createRecommendationTmdbClient({
        token: 'token',
        fetchImpl: null,
      }),
      expectCode(SERVER_ERROR_CODES.TMDB_UNAVAILABLE),
    )
  })
})
