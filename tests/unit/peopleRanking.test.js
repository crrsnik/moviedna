import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  balanceReadablePeople,
  isReadablePersonName,
  rankPeopleResults,
} from '../../src/features/catalog/services/peopleRanking.js'

function work({
  id,
  votes = 0,
  popularity = 0,
} = {}) {
  return {
    id,
    media_type: 'movie',
    title: `Work ${id}`,
    vote_count: votes,
    popularity,
  }
}

function person({
  id,
  name = `Person ${id}`,
  popularity = 0,
  profile = '/profile.jpg',
  works = [],
} = {}) {
  return {
    id,
    name,
    popularity,
    profile_path: profile,
    known_for: works,
  }
}

describe('people ranking', () => {
  it('prefers durable recognition in Popular over a temporary popularity spike', () => {
    const temporarySpike = person({
      id: 1,
      popularity: 300,
      works: [
        work({
          id: 11,
          votes: 20,
          popularity: 10,
        }),
      ],
    })

    const establishedActor = person({
      id: 2,
      popularity: 35,
      works: [
        work({
          id: 21,
          votes: 30000,
          popularity: 80,
        }),
        work({
          id: 22,
          votes: 18000,
          popularity: 60,
        }),
      ],
    })

    const ranked = rankPeopleResults(
      [
        temporarySpike,
        establishedActor,
      ],
      {
        view: 'popular',
      },
    )

    assert.equal(
      ranked[0].id,
      establishedActor.id,
    )
  })

  it('keeps profiles with usable photos ahead of incomplete profiles', () => {
    const noPhoto = person({
      id: 1,
      popularity: 1000,
      profile: null,
      works: [
        work({
          id: 11,
          votes: 50000,
          popularity: 500,
        }),
      ],
    })

    const completeProfile = person({
      id: 2,
      popularity: 10,
      profile: '/complete.jpg',
      works: [
        work({
          id: 21,
          votes: 100,
          popularity: 10,
        }),
      ],
    })

    const ranked = rankPeopleResults(
      [
        noPhoto,
        completeProfile,
      ],
      {
        view: 'popular',
      },
    )

    assert.equal(
      ranked[0].id,
      completeProfile.id,
    )
  })

  it('keeps the original weekly trend signal important', () => {
    const first = person({
      id: 1,
      popularity: 50,
      works: [
        work({
          id: 11,
          votes: 1000,
          popularity: 30,
        }),
      ],
    })

    const second = person({
      id: 2,
      popularity: 50,
      works: [
        work({
          id: 21,
          votes: 1000,
          popularity: 30,
        }),
      ],
    })

    const ranked = rankPeopleResults(
      [first, second],
      {
        view: 'trending',
      },
    )

    assert.deepEqual(
      ranked.map(item => item.id),
      [1, 2],
    )
  })

  it('deduplicates people', () => {
    const duplicate = person({
      id: 1,
      popularity: 20,
    })

    const ranked = rankPeopleResults([
      duplicate,
      duplicate,
      person({
        id: 2,
        popularity: 10,
      }),
    ])

    assert.deepEqual(
      ranked.map(item => item.id),
      [1, 2],
    )
  })

  it('recognizes Latin and Cyrillic names as readable', () => {
    assert.equal(
      isReadablePersonName(
        'Leonardo DiCaprio',
      ),
      true,
    )

    assert.equal(
      isReadablePersonName(
        'Леонардо ДиКаприо',
      ),
      true,
    )

    assert.equal(
      isReadablePersonName('演员'),
      false,
    )
  })

  it('keeps at least 14 readable names per 20 when the pool allows it', () => {
    const readable = Array.from(
      { length: 16 },
      (_, index) => ({
        id: index + 1,
        name: `Actor ${index + 1}`,
      }),
    )

    const nonReadable = Array.from(
      { length: 20 },
      (_, index) => ({
        id: 100 + index,
        name: `演员${index + 1}`,
      }),
    )

    const result =
      balanceReadablePeople(
        [
          ...nonReadable,
          ...readable,
        ],
        {
          pageSize: 20,
          minReadable: 14,
        },
      )

    const firstPage =
      result.slice(0, 20)

    const readableCount =
      firstPage.filter(person => (
        isReadablePersonName(
          person.name,
        )
      )).length

    assert.ok(
      readableCount >= 14,
    )
  })
})
