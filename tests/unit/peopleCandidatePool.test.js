import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildRecognitionPeoplePool,
  mergePeopleCandidatePools,
} from '../../src/features/catalog/services/peopleCandidatePool.js'

describe('people recognition candidate pool', () => {
  it('builds people from highly watched movie and TV casts', () => {
    const pool =
      buildRecognitionPeoplePool([
        {
          mediaType: 'movie',
          detail: {
            id: 10,
            title: 'Major Movie',
            vote_count: 30000,
            popularity: 100,
            credits: {
              cast: [
                {
                  id: 1,
                  name: 'Known Actor',
                  profile_path: '/a.jpg',
                  popularity: 20,
                },
              ],
            },
          },
        },
        {
          mediaType: 'tv',
          detail: {
            id: 20,
            name: 'Major Series',
            vote_count: 20000,
            popularity: 80,
            aggregate_credits: {
              cast: [
                {
                  id: 1,
                  name: 'Known Actor',
                  profile_path: '/a.jpg',
                  popularity: 25,
                },
              ],
            },
          },
        },
      ])

    assert.equal(pool.length, 1)
    assert.equal(pool[0].id, 1)
    assert.equal(
      pool[0].known_for.length,
      2,
    )
    assert.equal(
      pool[0].popularity,
      25,
    )
  })

  it('injects evergreen people only into Popular when requested', () => {
    const base = [{
      id: 1,
      name: 'Current Person',
      popularity: 5,
      known_for: [],
    }]

    const recognition = [{
      id: 2,
      name: 'Evergreen Actor',
      popularity: 10,
      known_for: [],
    }]

    assert.deepEqual(
      mergePeopleCandidatePools(
        base,
        recognition,
      ).map(person => person.id),
      [1],
    )

    assert.deepEqual(
      mergePeopleCandidatePools(
        base,
        recognition,
        {
          includeRecognition: true,
        },
      ).map(person => person.id),
      [1, 2],
    )
  })
})
