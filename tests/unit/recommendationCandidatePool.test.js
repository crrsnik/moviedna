import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildRecommendationCandidatePool } from '../../functions/src/recommendations/core/buildRecommendationCandidatePool.js'
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '../../functions/src/recommendations/core/recommendationErrors.js'

const movie = (id, popularity = 1, title = `Movie ${id}`) => ({
  id,
  title,
  popularity,
})

const tv = (id, popularity = 1, name = `TV ${id}`) => ({
  id,
  name,
  popularity,
})

function expectInvalid(run) {
  assert.throws(
    run,
    error => error instanceof RecommendationError
      && error.code === RECOMMENDATION_ERROR_CODES.INVALID_INPUT,
  )
}

describe('recommendation candidate pool', () => {
  it('merges movie and TV sources into normalized candidates', () => {
    const pool = buildRecommendationCandidatePool({
      sources: [
        {
          mediaType: 'movie',
          results: [movie(1, 20)],
        },
        {
          mediaType: 'tv',
          results: [tv(2, 10)],
        },
      ],
    })

    assert.deepEqual(
      pool.candidates.map(candidate => ({
        mediaKey: candidate.mediaKey,
        title: candidate.title,
      })),
      [
        { mediaKey: 'movie_1', title: 'Movie 1' },
        { mediaKey: 'tv_2', title: 'TV 2' },
      ],
    )

    assert.equal(pool.inputCount, 2)
    assert.equal(pool.rejectedCount, 0)
    assert.equal(pool.duplicateCount, 0)
    assert.equal(pool.trimmedCount, 0)
  })

  it('rejects malformed raw candidates without rejecting the whole pool', () => {
    const pool = buildRecommendationCandidatePool({
      sources: [{
        mediaType: 'movie',
        results: [
          movie(1),
          null,
          { id: -1, title: 'Invalid', popularity: 1 },
          { id: 2, title: 'Invalid popularity', popularity: Number.NaN },
        ],
      }],
    })

    assert.deepEqual(
      pool.candidates.map(candidate => candidate.mediaKey),
      ['movie_1'],
    )

    assert.equal(pool.inputCount, 4)
    assert.equal(pool.rejectedCount, 3)
  })

  it('deduplicates the same media identity and keeps the more useful duplicate', () => {
    const pool = buildRecommendationCandidatePool({
      sources: [
        {
          mediaType: 'movie',
          results: [movie(1, 10, '')],
        },
        {
          mediaType: 'movie',
          results: [movie(1, 20, 'Better Movie')],
        },
      ],
    })

    assert.equal(pool.candidates.length, 1)
    assert.equal(pool.candidates[0].mediaKey, 'movie_1')
    assert.equal(pool.candidates[0].title, 'Better Movie')
    assert.equal(pool.candidates[0].popularity, 20)
    assert.equal(pool.duplicateCount, 1)
  })

  it('is deterministic regardless of source order', () => {
    const sources = [
      {
        mediaType: 'movie',
        results: [
          movie(2, 5),
          movie(1, 10),
        ],
      },
      {
        mediaType: 'movie',
        results: [
          movie(1, 10, 'Alternative title'),
          movie(3, 7),
        ],
      },
    ]

    const forward = buildRecommendationCandidatePool({ sources })
    const reverse = buildRecommendationCandidatePool({
      sources: [...sources].reverse(),
    })

    assert.deepEqual(forward, reverse)
  })

  it('caps movies and TV independently', () => {
    const pool = buildRecommendationCandidatePool({
      maxPerMediaType: 2,
      sources: [
        {
          mediaType: 'movie',
          results: [
            movie(1, 1),
            movie(2, 3),
            movie(3, 2),
          ],
        },
        {
          mediaType: 'tv',
          results: [
            tv(1, 4),
            tv(2, 2),
            tv(3, 3),
          ],
        },
      ],
    })

    assert.deepEqual(
      pool.candidates.map(candidate => candidate.mediaKey),
      [
        'movie_2',
        'movie_3',
        'tv_1',
        'tv_3',
      ],
    )

    assert.equal(pool.trimmedCount, 2)
  })

  it('rejects malformed source envelopes and unsafe limits', () => {
    expectInvalid(() => buildRecommendationCandidatePool({
      sources: null,
    }))

    expectInvalid(() => buildRecommendationCandidatePool({
      sources: [{
        mediaType: 'person',
        results: [],
      }],
    }))

    expectInvalid(() => buildRecommendationCandidatePool({
      sources: [],
      maxPerMediaType: 0,
    }))

    expectInvalid(() => buildRecommendationCandidatePool({
      sources: [],
      maxPerMediaType: 501,
    }))
  })
})
