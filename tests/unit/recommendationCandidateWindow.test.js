import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  selectRecommendationCandidateWindow,
} from '../../functions/src/recommendations/core/selectRecommendationCandidateWindow.js'

function movie(
  id,
  popularity,
) {
  return {
    mediaKey: `movie_${id}`,
    tmdbId: id,
    mediaType: 'movie',
    popularity,
  }
}

describe(
  'recommendation candidate window',
  () => {
    it(
      'preserves strong seed candidates without letting them consume the whole window',
      () => {
        const candidates = [
          movie(1, 100),
          movie(2, 90),
          movie(3, 80),
          movie(4, 70),
          movie(5, 60),
          movie(90, 2),
          movie(91, 1),
          movie(92, 0.5),
        ]

        const seedAffinity =
          new Map([
            [
              'movie_90',
              { affinity: 0.9 },
            ],
            [
              'movie_91',
              { affinity: 0.8 },
            ],
            [
              'movie_92',
              { affinity: 0.7 },
            ],
          ])

        const result =
          selectRecommendationCandidateWindow({
            candidates,
            seedAffinity,
            maxPerMediaType: 5,
          })

        assert.deepEqual(
          result.map(
            item => item.mediaKey,
          ),
          [
            'movie_90',
            'movie_91',
            'movie_1',
            'movie_2',
            'movie_3',
          ],
        )
      },
    )

    it(
      'backfills unused generic capacity with more seed candidates',
      () => {
        const candidates = [
          movie(1, 100),
          movie(90, 3),
          movie(91, 2),
          movie(92, 1),
        ]

        const seedAffinity =
          new Map([
            [
              'movie_90',
              { affinity: 0.9 },
            ],
            [
              'movie_91',
              { affinity: 0.8 },
            ],
            [
              'movie_92',
              { affinity: 0.7 },
            ],
          ])

        const result =
          selectRecommendationCandidateWindow({
            candidates,
            seedAffinity,
            maxPerMediaType: 4,
          })

        assert.equal(
          result.length,
          4,
        )

        assert.deepEqual(
          new Set(
            result.map(
              item => item.mediaKey,
            ),
          ),
          new Set([
            'movie_1',
            'movie_90',
            'movie_91',
            'movie_92',
          ]),
        )
      },
    )

    it(
      'keeps popularity ordering when there is no seed affinity',
      () => {
        const result =
          selectRecommendationCandidateWindow({
            candidates: [
              movie(1, 20),
              movie(2, 100),
              movie(3, 50),
            ],
            maxPerMediaType: 2,
          })

        assert.deepEqual(
          result.map(
            item => item.mediaKey,
          ),
          [
            'movie_2',
            'movie_3',
          ],
        )
      },
    )
  },
)
