import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  RECOMMENDATION_LIKE_SEED_WEIGHT,
  RECOMMENDATION_MAX_SEEDS,
  selectRecommendationSeeds,
} from '../../functions/src/recommendations/core/selectRecommendationSeeds.js'

describe('recommendation seeds', () => {
  it('uses highly rated titles with stronger weights for stronger ratings', () => {
    const seeds = selectRecommendationSeeds([
      {
        tmdbId: 1399,
        mediaType: 'tv',
        rating: 10,
      },
      {
        tmdbId: 94997,
        mediaType: 'tv',
        rating: 9,
      },
      {
        tmdbId: 157336,
        mediaType: 'movie',
        rating: 8,
      },
      {
        tmdbId: 550,
        mediaType: 'movie',
        rating: 7,
      },
    ])

    assert.deepEqual(
      seeds,
      [
        {
          mediaKey: 'tv_1399',
          tmdbId: 1399,
          mediaType: 'tv',
          rating: 10,
          weight: 1,
        },
        {
          mediaKey: 'tv_94997',
          tmdbId: 94997,
          mediaType: 'tv',
          rating: 9,
          weight: 0.85,
        },
        {
          mediaKey: 'movie_157336',
          tmdbId: 157336,
          mediaType: 'movie',
          rating: 8,
          weight: 0.65,
        },
      ],
    )
  })

  it('uses onboarding and refinement likes as positive seeds', () => {
    const seeds = selectRecommendationSeeds([
      {
        tmdbId: 1399,
        mediaType: 'tv',
        reaction: 'like',
      },
      {
        tmdbId: 550,
        mediaType: 'movie',
        reaction: 'dislike',
      },
      {
        tmdbId: 603,
        mediaType: 'movie',
        reaction: 'skip',
      },
    ])

    assert.deepEqual(
      seeds,
      [
        {
          mediaKey: 'tv_1399',
          tmdbId: 1399,
          mediaType: 'tv',
          rating: null,
          weight:
            RECOMMENDATION_LIKE_SEED_WEIGHT,
        },
      ],
    )
  })

  it('places a like between 9/10 and 8/10 signals', () => {
    const seeds = selectRecommendationSeeds([
      {
        tmdbId: 1,
        mediaType: 'movie',
        rating: 8,
      },
      {
        tmdbId: 2,
        mediaType: 'movie',
        reaction: 'like',
      },
      {
        tmdbId: 3,
        mediaType: 'movie',
        rating: 9,
      },
    ])

    assert.deepEqual(
      seeds.map(seed => seed.tmdbId),
      [3, 2, 1],
    )
  })

  it('prefers an explicit rating over an onboarding like for the same title', () => {
    const seeds = selectRecommendationSeeds([
      {
        tmdbId: 1399,
        mediaType: 'tv',
        reaction: 'like',
      },
      {
        tmdbId: 1399,
        mediaType: 'tv',
        rating: 8,
      },
    ])

    assert.deepEqual(
      seeds,
      [
        {
          mediaKey: 'tv_1399',
          tmdbId: 1399,
          mediaType: 'tv',
          rating: 8,
          weight: 0.65,
        },
      ],
    )
  })

  it('keeps the strongest duplicate rating deterministically', () => {
    const seeds = selectRecommendationSeeds([
      {
        tmdbId: 1399,
        mediaType: 'tv',
        rating: 8,
      },
      {
        tmdbId: 1399,
        mediaType: 'tv',
        rating: 10,
      },
    ])

    assert.deepEqual(
      seeds,
      [
        {
          mediaKey: 'tv_1399',
          tmdbId: 1399,
          mediaType: 'tv',
          rating: 10,
          weight: 1,
        },
      ],
    )
  })

  it('ignores malformed, neutral and negative inputs', () => {
    const seeds = selectRecommendationSeeds([
      null,
      {},
      {
        tmdbId: 0,
        mediaType: 'movie',
        rating: 10,
      },
      {
        tmdbId: 1,
        mediaType: 'person',
        rating: 10,
      },
      {
        tmdbId: 2,
        mediaType: 'movie',
        rating: 6,
      },
      {
        tmdbId: 3,
        mediaType: 'movie',
        rating: 11,
      },
      {
        tmdbId: 4,
        mediaType: 'tv',
        reaction: 'dislike',
      },
      {
        tmdbId: 5,
        mediaType: 'tv',
        reaction: 'skip',
      },
    ])

    assert.deepEqual(seeds, [])
  })

  it('caps the seed set so recommendation expansion stays bounded', () => {
    const ratings = Array.from(
      {
        length:
          RECOMMENDATION_MAX_SEEDS + 5,
      },
      (_, index) => ({
        tmdbId: index + 1,
        mediaType:
          index % 2 === 0
            ? 'movie'
            : 'tv',
        rating: 10,
      }),
    )

    const seeds =
      selectRecommendationSeeds(ratings)

    assert.equal(
      seeds.length,
      RECOMMENDATION_MAX_SEEDS,
    )
  })

  it('supports a smaller explicit limit', () => {
    const seeds = selectRecommendationSeeds(
      [
        {
          tmdbId: 3,
          mediaType: 'movie',
          rating: 8,
        },
        {
          tmdbId: 2,
          mediaType: 'movie',
          rating: 9,
        },
        {
          tmdbId: 1,
          mediaType: 'movie',
          rating: 10,
        },
      ],
      {
        limit: 2,
      },
    )

    assert.deepEqual(
      seeds.map(seed => seed.tmdbId),
      [1, 2],
    )
  })
})
