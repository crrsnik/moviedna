import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  buildRecommendationSeedAffinity,
} from '../../functions/src/recommendations/core/buildRecommendationSeedAffinity.js'

function seed(
  tmdbId,
  rating,
  weight,
) {
  return {
    mediaKey: `tv_${tmdbId}`,
    tmdbId,
    mediaType: 'tv',
    rating,
    weight,
  }
}

function source(
  seedId,
  ids,
) {
  return {
    mediaType: 'tv',
    source:
      `seed:tv_${seedId}:1`,
    results: ids.map(id => ({
      id,
    })),
  }
}

describe(
  'recommendation seed affinity',
  () => {
    it(
      'gives stronger affinity to higher ranked recommendations',
      () => {
        const affinity =
          buildRecommendationSeedAffinity({
            seeds: [
              seed(
                1399,
                10,
                1,
              ),
            ],
            sources: [
              source(
                1399,
                [
                  94997,
                  66732,
                  100088,
                ],
              ),
            ],
          })

        assert.equal(
          affinity.get(
            'tv_94997',
          ).affinity,
          1,
        )

        assert.ok(
          affinity.get(
            'tv_66732',
          ).affinity
          > affinity.get(
            'tv_100088',
          ).affinity,
        )
      },
    )

    it(
      'respects the strength of the user rating seed',
      () => {
        const affinity =
          buildRecommendationSeedAffinity({
            seeds: [
              seed(
                1,
                10,
                1,
              ),
              seed(
                2,
                8,
                0.65,
              ),
            ],
            sources: [
              source(
                1,
                [100],
              ),
              source(
                2,
                [200],
              ),
            ],
          })

        assert.ok(
          affinity.get(
            'tv_100',
          ).affinity
          > affinity.get(
            'tv_200',
          ).affinity,
        )
      },
    )

    it(
      'boosts candidates supported by multiple favorite titles',
      () => {
        const affinity =
          buildRecommendationSeedAffinity({
            seeds: [
              seed(
                1,
                9,
                0.85,
              ),
              seed(
                2,
                9,
                0.85,
              ),
            ],
            sources: [
              source(
                1,
                [500],
              ),
              source(
                2,
                [500],
              ),
            ],
          })

        const result =
          affinity.get(
            'tv_500',
          )

        assert.equal(
          result.seedCount,
          2,
        )

        assert.ok(
          result.affinity > 0.85,
        )

        assert.ok(
          result.affinity <= 1,
        )
      },
    )

    it(
      'ignores non-seed sources and malformed candidates',
      () => {
        const affinity =
          buildRecommendationSeedAffinity({
            seeds: [
              seed(
                1399,
                10,
                1,
              ),
            ],
            sources: [
              {
                mediaType: 'tv',
                source: 'popular:1',
                results: [
                  {
                    id: 94997,
                  },
                ],
              },
              {
                mediaType: 'tv',
                source:
                  'seed:tv_1399:1',
                results: [
                  {},
                  {
                    id: 0,
                  },
                ],
              },
            ],
          })

        assert.equal(
          affinity.size,
          0,
        )
      },
    )
  },
)
