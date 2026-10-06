import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  rankPopularResults,
} from '../../src/features/catalog/services/popularRanking.js'

function movie(
  id,
  {
    popularity,
    voteCount,
    posterPath = `/poster-${id}.jpg`,
  },
) {
  return {
    id,
    mediaType: 'movie',
    title: `Movie ${id}`,
    posterPath,
    popularity,
    voteCount,
  }
}

describe('Popular mainstream ranking', () => {
  it(
    'demotes an obscure popularity spike behind an established current title',
    () => {
      const obscureSpike = movie(1, {
        popularity: 1000,
        voteCount: 10,
      })

      const established = movie(2, {
        popularity: 200,
        voteCount: 50000,
      })

      const result = rankPopularResults(
        [
          obscureSpike,
          established,
        ],
        'movie',
        {
          trendingIds: [1],
        },
      )

      assert.equal(
        result[0].id,
        2,
      )
    },
  )

  it(
    'still allows a genuinely viral new release to beat an established title',
    () => {
      const established = movie(1, {
        popularity: 200,
        voteCount: 50000,
      })

      const viralNewRelease = movie(2, {
        popularity: 900,
        voteCount: 500,
      })

      const result = rankPopularResults(
        [
          established,
          viralNewRelease,
        ],
        'movie',
        {
          trendingIds: [2],
        },
      )

      assert.equal(
        result[0].id,
        2,
      )
    },
  )

  it(
    'does not penalize old titles merely for being old',
    () => {
      const oldMainstream = {
        ...movie(1, {
          popularity: 250,
          voteCount: 100000,
        }),
        releaseDate: '1994-09-23',
      }

      const recentButWeak = {
        ...movie(2, {
          popularity: 80,
          voteCount: 300,
        }),
        releaseDate: '2026-09-20',
      }

      const result = rankPopularResults(
        [
          recentButWeak,
          oldMainstream,
        ],
        'movie',
      )

      assert.equal(
        result[0].id,
        1,
      )
    },
  )

  it(
    'requires a usable poster for the curated Popular surface',
    () => {
      const result = rankPopularResults(
        [
          movie(1, {
            popularity: 500,
            voteCount: 5000,
            posterPath: null,
          }),
          movie(2, {
            popularity: 100,
            voteCount: 1000,
          }),
        ],
        'movie',
      )

      assert.deepEqual(
        result.map(item => item.id),
        [2],
      )
    },
  )

  it(
    'deduplicates candidates deterministically',
    () => {
      const first = movie(1, {
        popularity: 100,
        voteCount: 1000,
      })

      const duplicate = {
        ...first,
        popularity: 9999,
      }

      const result = rankPopularResults(
        [
          first,
          duplicate,
        ],
        'movie',
      )

      assert.equal(result.length, 1)
      assert.equal(
        result[0].popularity,
        100,
      )
    },
  )
})
