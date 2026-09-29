import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRecommendationPipeline } from '../../functions/src/recommendations/recommendationPipeline.js'
import {
  RecommendationError,
  RECOMMENDATION_ERROR_CODES,
} from '../../functions/src/recommendations/core/recommendationErrors.js'

function entry(
  key,
  score = 1,
  confidence = 1,
) {
  return {
    key,
    score,
    confidence,
  }
}

function dna(overrides = {}) {
  return {
    schemaVersion: 1,
    algorithmVersion: '1.0.0',
    dimensions: {
      genres: [entry('genre:28')],
      mediaTypes: [
        entry('media:movie'),
        entry('media:tv', 0.5),
      ],
      decades: [entry('decade:2010')],
      languages: [entry('language:en')],
      countries: [entry('country:US')],
      directors: [entry('person:100')],
      creators: [entry('person:300')],
      actors: [entry('person:200')],
      ...overrides,
    },
  }
}

function movie(
  id,
  popularity = 10,
) {
  return {
    id,
    title: `Movie ${id}`,
    popularity,
  }
}

function tv(
  id,
  popularity = 10,
) {
  return {
    id,
    name: `TV ${id}`,
    popularity,
  }
}

function metadataFor(candidate) {
  const movieType =
    candidate.mediaType === 'movie'

  return {
    status: 'ready',
    genres: [{
      id: 28,
      label: 'Action',
    }],
    releaseYear: 2014,
    originalLanguage: {
      code: 'en',
      label: 'English',
    },
    countries: [{
      code: 'US',
      label: 'United States',
    }],
    directors: movieType
      ? [{
        id: 100,
        name: 'Director',
      }]
      : [],
    creators: movieType
      ? []
      : [{
        id: 300,
        name: 'Creator',
      }],
    actors: [{
      id: 200,
      name: 'Actor',
      billingOrder: 0,
    }],
    completeness: {
      genres: true,
      releaseYear: true,
      originalLanguage: true,
      countries: true,
      people: true,
    },
  }
}

function sourceClient({
  failPopularMovie = false,
  failAll = false,
} = {}) {
  async function maybeFail(
    mediaType,
    source,
  ) {
    if (
      failAll
      || (
        failPopularMovie
        && mediaType === 'movie'
        && source === 'popular'
      )
    ) {
      throw new Error(
        `${mediaType}-${source}-failed`,
      )
    }
  }

  return {
    async getTrending(mediaType) {
      await maybeFail(
        mediaType,
        'trending',
      )

      return {
        mediaType,
        source: 'trending',
        results: mediaType === 'movie'
          ? [
            movie(1, 30),
            movie(2, 20),
          ]
          : [
            tv(1, 25),
          ],
      }
    },

    async getPopular(mediaType, page) {
      await maybeFail(
        mediaType,
        'popular',
      )

      return {
        mediaType,
        source: `popular:${page}`,
        results: mediaType === 'movie'
          ? [
            movie(1, 30),
            movie(3, 15),
          ]
          : [
            tv(2, 12),
          ],
      }
    },

    async getTopRated(mediaType, page) {
      await maybeFail(
        mediaType,
        'topRated',
      )

      return {
        mediaType,
        source: `top-rated:${page}`,
        results: [],
      }
    },

    async discoverByGenre(
      mediaType,
      genreId,
      page,
    ) {
      await maybeFail(
        mediaType,
        'genre',
      )

      return {
        mediaType,
        source:
          `genre:${genreId}:${page}`,
        results: mediaType === 'movie'
          ? [movie(4, 18)]
          : [tv(3, 17)],
      }
    },
  }
}

function metadataResolver({
  malformedKey = null,
} = {}) {
  const calls = []

  return {
    calls,

    async resolve(candidates) {
      calls.push(
        candidates.map(
          candidate => candidate.mediaKey,
        ),
      )

      return candidates.map(candidate => ({
        ...candidate,
        metadata:
          candidate.mediaKey === malformedKey
            ? null
            : metadataFor(candidate),
      }))
    },
  }
}

function expectInvalid(run) {
  assert.throws(
    run,
    error => (
      error instanceof RecommendationError
      && error.code
        === RECOMMENDATION_ERROR_CODES.INVALID_INPUT
    ),
  )
}

describe('recommendation pipeline', () => {
  it('runs source collection through ranking end to end', async () => {
    const resolver = metadataResolver()

    const pipeline =
      createRecommendationPipeline({
        sourceClient: sourceClient(),
        metadataResolver: resolver,
      })

    const result = await pipeline.run({
      dna: dna(),
    })

    assert.deepEqual(
      result.genreIds,
      [28],
    )

    assert.equal(
      result.stats.sourceRequestCount,
      8,
    )

    assert.equal(
      result.stats.sourceSuccessCount,
      8,
    )

    assert.equal(
      result.stats.sourceFailureCount,
      0,
    )

    assert.equal(
      result.stats.duplicateCount,
      1,
    )

    assert.deepEqual(
      result.results.map(
        item => item.mediaKey,
      ),
      [
        'movie_1',
        'movie_2',
        'movie_4',
        'movie_3',
        'tv_1',
        'tv_3',
        'tv_2',
      ],
    )

    assert.equal(
      result.results[0].score,
      100,
    )

    assert.equal(
      result.results[0]
        .hasPersonalizationEvidence,
      true,
    )
  })

  it('excludes rated and hidden media before metadata resolution', async () => {
    const resolver = metadataResolver()

    const pipeline =
      createRecommendationPipeline({
        sourceClient: sourceClient(),
        metadataResolver: resolver,
      })

    const result = await pipeline.run({
      dna: dna(),
      rated: [{
        mediaType: 'movie',
        tmdbId: 1,
      }],
      hidden: ['tv_1'],
    })

    assert.equal(
      result.stats.knownExcludedCount,
      2,
    )

    assert.ok(
      !resolver.calls[0].includes(
        'movie_1',
      ),
    )

    assert.ok(
      !resolver.calls[0].includes(
        'tv_1',
      ),
    )

    assert.ok(
      !result.results.some(
        item => (
          item.mediaKey === 'movie_1'
          || item.mediaKey === 'tv_1'
        ),
      ),
    )
  })

  it('continues when some candidate sources fail', async () => {
    const resolver = metadataResolver()

    const pipeline =
      createRecommendationPipeline({
        sourceClient: sourceClient({
          failPopularMovie: true,
        }),
        metadataResolver: resolver,
      })

    const result = await pipeline.run({
      dna: dna(),
    })

    assert.equal(
      result.stats.sourceFailureCount,
      1,
    )

    assert.equal(
      result.stats.sourceSuccessCount,
      7,
    )

    assert.ok(
      result.results.length > 0,
    )
  })

  it('fails instead of silently returning empty when every source request fails', async () => {
    const failure =
      new Error('all sources unavailable')

    const client = {
      getTrending: async () => {
        throw failure
      },
      getPopular: async () => {
        throw failure
      },
      getTopRated: async () => {
        throw failure
      },
      discoverByGenre: async () => {
        throw failure
      },
    }

    const pipeline =
      createRecommendationPipeline({
        sourceClient: client,
        metadataResolver:
          metadataResolver(),
      })

    await assert.rejects(
      pipeline.run({
        dna: dna({
          genres: [],
        }),
      }),
      error => error === failure,
    )
  })

  it('rejects malformed resolved candidates without breaking valid recommendations', async () => {
    const resolver = metadataResolver({
      malformedKey: 'movie_2',
    })

    const pipeline =
      createRecommendationPipeline({
        sourceClient: sourceClient(),
        metadataResolver: resolver,
      })

    const result = await pipeline.run({
      dna: dna(),
    })

    assert.equal(
      result.stats
        .preparationRejectedCount,
      1,
    )

    assert.ok(
      !result.results.some(
        item => (
          item.mediaKey === 'movie_2'
        ),
      ),
    )

    assert.ok(
      result.results.length > 0,
    )
  })

  it('supports a profile with no positive genres using generic sources only', async () => {
    const pipeline =
      createRecommendationPipeline({
        sourceClient: sourceClient(),
        metadataResolver:
          metadataResolver(),
      })

    const result = await pipeline.run({
      dna: dna({
        genres: [
          entry('genre:28', -1),
        ],
      }),
    })

    assert.deepEqual(
      result.genreIds,
      [],
    )

    assert.equal(
      result.stats.sourceRequestCount,
      6,
    )
  })

  it('rejects malformed dependencies and unsafe concurrency', () => {
    expectInvalid(
      () => createRecommendationPipeline({
        sourceClient: null,
        metadataResolver:
          metadataResolver(),
      }),
    )

    expectInvalid(
      () => createRecommendationPipeline({
        sourceClient: sourceClient(),
        metadataResolver: null,
      }),
    )

    expectInvalid(
      () => createRecommendationPipeline({
        sourceClient: sourceClient(),
        metadataResolver:
          metadataResolver(),
        sourceConcurrency: 0,
      }),
    )

    expectInvalid(
      () => createRecommendationPipeline({
        sourceClient: sourceClient(),
        metadataResolver:
          metadataResolver(),
        sourceConcurrency: 9,
      }),
    )
  })
})
