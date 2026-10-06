import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  rankTopRatedResults,
  topRatedScore,
} from '../../src/features/catalog/services/topRatedRanking.js'


function item(
  id,
  voteAverage,
  voteCount,
  popularity = 0,
) {
  return {
    id,
    mediaType: 'movie',
    title: `Title ${id}`,
    voteAverage,
    voteCount,
    popularity,
  }
}


describe('MovieDNA Top Rated ranking', () => {
  it('prefers a strongly established movie over a tiny higher raw rating', () => {
    const results =
      rankTopRatedResults(
        [
          item(1, 9.0, 600),
          item(2, 8.5, 60000),
        ],
        'movie',
      )

    assert.deepEqual(
      results.map(value => value.id),
      [2, 1],
    )
  })


  it('still rewards rating when vote confidence is similar', () => {
    const results =
      rankTopRatedResults(
        [
          item(1, 8.2, 20000),
          item(2, 8.8, 20000),
        ],
        'movie',
      )

    assert.deepEqual(
      results.map(value => value.id),
      [2, 1],
    )
  })


  it('uses stronger confidence correction for TV ratings', () => {
    const weak =
      item(1, 9.2, 300)

    const established =
      item(2, 8.6, 30000)

    assert.ok(
      topRatedScore(
        established,
        'tv',
      )
      > topRatedScore(
        weak,
        'tv',
      ),
    )
  })


  it('does not mutate upstream ordering input', () => {
    const input = [
      item(1, 9, 500),
      item(2, 8.5, 50000),
    ]

    const original = [...input]

    rankTopRatedResults(
      input,
      'movie',
    )

    assert.deepEqual(
      input,
      original,
    )
  })


  it('is deterministic', () => {
    const input = [
      item(3, 8.7, 10000),
      item(2, 8.7, 10000),
      item(1, 8.7, 10000),
    ]

    assert.deepEqual(
      rankTopRatedResults(
        input,
        'movie',
      ),
      rankTopRatedResults(
        input,
        'movie',
      ),
    )
  })
})

describe('strong vote-count influence', () => {
  it('strongly prefers broadly established movies', () => {
    const ranked = rankTopRatedResults(
      [
        item(1, 9.2, 700),
        item(2, 8.6, 80000),
        item(3, 8.5, 200000),
      ],
      'movie',
    )

    assert.deepEqual(
      ranked.map(value => value.id),
      [3, 2, 1],
    )
  })

  it('strongly discounts niche TV ratings', () => {
    const niche = item(
      1,
      9.4,
      800,
    )

    const established = item(
      2,
      8.7,
      50000,
    )

    assert.ok(
      topRatedScore(
        established,
        'tv',
      )
      > topRatedScore(
        niche,
        'tv',
      ),
    )
  })
})

describe('established Top Rated head', () => {
  it('keeps established TV titles dominant in the first pages', () => {
    const established = Array.from(
      { length: 12 },
      (_, index) => item(
        100 + index,
        8.4 - index * 0.01,
        50000 - index * 1000,
      ),
    )

    const niche = Array.from(
      { length: 12 },
      (_, index) => item(
        200 + index,
        9.4 - index * 0.01,
        700 + index,
      ),
    )

    const ranked =
      rankTopRatedResults(
        [
          ...niche,
          ...established,
        ],
        'tv',
      )

    const firstTen =
      ranked.slice(0, 10)

    const establishedCount =
      firstTen.filter(
        value => value.voteCount >= 5000,
      ).length

    assert.ok(
      establishedCount >= 8,
    )
  })
})
