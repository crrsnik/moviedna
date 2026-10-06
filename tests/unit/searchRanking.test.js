import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  rankSearchResults,
} from '../../src/features/catalog/services/searchRanking.js'


function movie(
  id,
  title,
  {
    popularity = 0,
    voteCount = 0,
    voteAverage = 0,
  } = {},
) {
  return {
    id,
    mediaType: 'movie',
    title,
    popularity,
    voteCount,
    voteAverage,
  }
}


function person(
  id,
  name,
  popularity = 0,
) {
  return {
    id,
    mediaType: 'person',
    name,
    popularity,
  }
}


describe('search relevance ranking', () => {
  it('keeps exact matches above much more popular partial matches', () => {
    const ranked = rankSearchResults(
      [
        movie(
          1,
          'The Dune Companion',
          {
            popularity: 500,
            voteCount: 50000,
          },
        ),
        movie(
          2,
          'Dune',
          {
            popularity: 10,
            voteCount: 100,
          },
        ),
      ],
      'Dune',
    )

    assert.equal(
      ranked[0].id,
      2,
    )
  })


  it('orders exact, prefix, word-prefix, substring and non-match tiers', () => {
    const ranked = rankSearchResults(
      [
        movie(
          1,
          'Urban Batman Story',
          { popularity: 1000 },
        ),
        movie(
          2,
          'Batman Begins',
        ),
        movie(
          3,
          'The Batman',
        ),
        movie(
          4,
          'Batman',
        ),
        movie(
          5,
          'Superman',
          { popularity: 5000 },
        ),
      ],
      'Batman',
    )

    assert.deepEqual(
      ranked.map(item => item.id),
      [4, 2, 3, 1, 5],
    )
  })


  it('uses popularity then vote evidence inside the same relevance tier', () => {
    const ranked = rankSearchResults(
      [
        movie(
          1,
          'Alien One',
          {
            popularity: 20,
            voteCount: 5000,
          },
        ),
        movie(
          2,
          'Alien Two',
          {
            popularity: 80,
            voteCount: 10,
          },
        ),
        movie(
          3,
          'Alien Three',
          {
            popularity: 80,
            voteCount: 3000,
          },
        ),
      ],
      'Alien',
    )

    assert.deepEqual(
      ranked.map(item => item.id),
      [3, 2, 1],
    )
  })


  it('ranks people and media together and is accent insensitive', () => {
    const ranked = rankSearchResults(
      [
        person(
          1,
          'Renée Example',
          5,
        ),
        movie(
          2,
          'The Renee Story',
          { popularity: 100 },
        ),
      ],
      'Renee',
    )

    assert.equal(
      ranked[0].id,
      1,
    )
  })


  it('is deterministic and does not mutate its input', () => {
    const input = [
      movie(2, 'Test B'),
      movie(1, 'Test A'),
    ]

    const snapshot = [...input]

    const first =
      rankSearchResults(
        input,
        'Test',
      )

    const second =
      rankSearchResults(
        input,
        'Test',
      )

    assert.deepEqual(
      input,
      snapshot,
    )

    assert.deepEqual(
      first,
      second,
    )
  })
})
