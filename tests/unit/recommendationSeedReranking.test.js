import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  rerankRecommendationResults,
} from '../../functions/src/recommendations/core/rerankRecommendationResults.js'

function result(
  id,
  score,
) {
  return {
    mediaKey: `movie_${id}`,
    mediaType: 'movie',
    tmdbId: id,
    score,
    profileEvidenceCoverage: 1,
    popularity: 10,
    breakdown: [
      {
        dimension: 'genres',
        contribution: 0.2,
      },
    ],
  }
}

function candidate(id) {
  return {
    mediaKey: `movie_${id}`,
    mediaType: 'movie',
    tmdbId: id,
    popularity: 10,

    // Keep these candidates outside the
    // mainstream-quality bucket so this test
    // isolates personal ordering.
    voteAverage: 6,
    voteCount: 10,

    metadata: {
      genres: [],
      directors: [],
      creators: [],
    },
  }
}

describe(
  'recommendation seed reranking',
  () => {
    it(
      'promotes a strong title-to-title recommendation without changing DNA match score',
      () => {
        const ordinary =
          result(1, 75)

        const seedRelated =
          result(2, 62)

        const candidates = [
          candidate(1),
          candidate(2),
        ]

        const baseline =
          rerankRecommendationResults({
            rankedResults: [
              ordinary,
              seedRelated,
            ],
            candidates,
          })

        assert.equal(
          baseline[0].mediaKey,
          'movie_1',
        )

        const reranked =
          rerankRecommendationResults({
            rankedResults: [
              ordinary,
              seedRelated,
            ],
            candidates,
            seedAffinity: new Map([
              [
                'movie_2',
                {
                  affinity: 1,
                  seedCount: 1,
                },
              ],
            ]),
          })

        assert.equal(
          reranked[0].mediaKey,
          'movie_2',
        )

        assert.equal(
          reranked[0].score,
          62,
        )

        assert.equal(
          reranked.find(
            item =>
              item.mediaKey
                === 'movie_1',
          ).score,
          75,
        )
      },
    )

    it(
      'keeps the seed boost bounded so a weak DNA fit cannot dominate everything',
      () => {
        const strongDna =
          result(1, 90)

        const weakDna =
          result(2, 40)

        const reranked =
          rerankRecommendationResults({
            rankedResults: [
              strongDna,
              weakDna,
            ],
            candidates: [
              candidate(1),
              candidate(2),
            ],
            seedAffinity: new Map([
              [
                'movie_2',
                {
                  affinity: 1,
                  seedCount: 3,
                },
              ],
            ]),
          })

        assert.equal(
          reranked[0].mediaKey,
          'movie_1',
        )
      },
    )

    it(
      'preserves previous ordering when no seed affinity exists',
      () => {
        const reranked =
          rerankRecommendationResults({
            rankedResults: [
              result(2, 60),
              result(1, 80),
            ],
            candidates: [
              candidate(1),
              candidate(2),
            ],
          })

        assert.deepEqual(
          reranked.map(
            item => item.mediaKey,
          ),
          [
            'movie_1',
            'movie_2',
          ],
        )
      },
    )
  },
)
