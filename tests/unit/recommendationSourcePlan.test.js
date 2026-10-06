import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildRecommendationSourcePlan,
  preferredRecommendationGenreIds,
} from '../../functions/src/recommendations/core/buildRecommendationSourcePlan.js'
import {
  RecommendationError,
  RECOMMENDATION_ERROR_CODES,
} from '../../functions/src/recommendations/core/recommendationErrors.js'

function dna(genres = []) {
  return {
    schemaVersion: 1,
    algorithmVersion: '1.0.0',
    dimensions: {
      genres,
    },
  }
}

function entry(
  id,
  score,
  confidence = 1,
) {
  return {
    key: `genre:${id}`,
    score,
    confidence,
  }
}

function expectInvalid(run) {
  assert.throws(
    run,
    error => error instanceof RecommendationError
      && error.code
        === RECOMMENDATION_ERROR_CODES.INVALID_INPUT,
  )
}

describe('recommendation source plan', () => {
  it('selects strongest positive genres using score times confidence', () => {
    const result = preferredRecommendationGenreIds(
      dna([
        entry(28, 0.9, 0.5),
        entry(18, 0.6, 1),
        entry(878, 0.8, 0.9),
        entry(35, -1, 1),
      ]),
    )

    assert.deepEqual(result, [878, 18, 28])
  })

  it('ignores neutral, negative and malformed genre entries', () => {
    const result = preferredRecommendationGenreIds(
      dna([
        entry(28, 0),
        entry(18, -0.5),
        { key: 'genre:bad', score: 1, confidence: 1 },
        { key: 'genre:35', score: '1', confidence: 1 },
        entry(878, 0.5),
      ]),
    )

    assert.deepEqual(result, [878])
  })

  it('deduplicates genre identities and keeps their strongest positive signal', () => {
    const result = preferredRecommendationGenreIds(
      dna([
        entry(28, 0.2),
        entry(28, 0.8),
        entry(18, 0.5),
      ]),
    )

    assert.deepEqual(result, [28, 18])
  })

  it('uses genre id as a deterministic tie breaker', () => {
    const result = preferredRecommendationGenreIds(
      dna([
        entry(35, 0.5),
        entry(18, 0.5),
        entry(28, 0.5),
      ]),
    )

    assert.deepEqual(result, [18, 28, 35])
  })

  it('supports disabling personalized genre discovery', () => {
    assert.deepEqual(
      preferredRecommendationGenreIds(
        dna([entry(28, 1)]),
        0,
      ),
      [],
    )
  })

  it('builds generic and genre-specific movie and TV requests', () => {
    const plan = buildRecommendationSourcePlan({
      dna: dna([
        entry(28, 1),
        entry(18, 0.5),
      ]),
    })

    assert.deepEqual(plan.genreIds, [28, 18])

    assert.deepEqual(plan.requests, [
      { type: 'trending', mediaType: 'movie' },
      { type: 'popular', mediaType: 'movie', page: 1 },
      { type: 'popular', mediaType: 'movie', page: 2 },
      { type: 'popular', mediaType: 'movie', page: 3 },
      { type: 'topRated', mediaType: 'movie', page: 1 },

      { type: 'trending', mediaType: 'tv' },
      { type: 'popular', mediaType: 'tv', page: 1 },
      { type: 'popular', mediaType: 'tv', page: 2 },
      { type: 'popular', mediaType: 'tv', page: 3 },
      { type: 'topRated', mediaType: 'tv', page: 1 },

      {
        type: 'genre',
        mediaType: 'movie',
        genreId: 28,
        page: 1,
      },
      {
        type: 'genre',
        mediaType: 'tv',
        genreId: 28,
        page: 1,
      },
      {
        type: 'genre',
        mediaType: 'movie',
        genreId: 28,
        page: 2,
      },
      {
        type: 'genre',
        mediaType: 'tv',
        genreId: 28,
        page: 2,
      },

      {
        type: 'genre',
        mediaType: 'movie',
        genreId: 18,
        page: 1,
      },
      {
        type: 'genre',
        mediaType: 'tv',
        genreId: 18,
        page: 1,
      },
      {
        type: 'genre',
        mediaType: 'movie',
        genreId: 18,
        page: 2,
      },
      {
        type: 'genre',
        mediaType: 'tv',
        genreId: 18,
        page: 2,
      },
    ])
  })

  it('returns only generic requests when there are no positive genres', () => {
    const plan = buildRecommendationSourcePlan({
      dna: dna([
        entry(28, -1),
        entry(18, 0),
      ]),
    })

    assert.deepEqual(plan.genreIds, [])
    assert.equal(plan.requests.length, 10)
  })

  it('rejects malformed envelopes and unsafe limits', () => {
    expectInvalid(
      () => preferredRecommendationGenreIds(null),
    )

    expectInvalid(
      () => preferredRecommendationGenreIds(
        { dimensions: { genres: null } },
      ),
    )

    expectInvalid(
      () => preferredRecommendationGenreIds(
        dna(),
        -1,
      ),
    )

    expectInvalid(
      () => preferredRecommendationGenreIds(
        dna(),
        6,
      ),
    )
  })
})
