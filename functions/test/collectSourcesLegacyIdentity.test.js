import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { SERVER_ERROR_CODES } from '../src/errors.js'
import { collectDnaSources } from '../src/sources/collectSources.js'

const profile = {
  username: 'synthetic',
  displayName: 'Synthetic User',
  onboardingCompleted: true,
}

function snapshot(overrides = {}) {
  return {
    uid: 'synthetic-user',
    profile,
    ratings: [],
    onboardingResponses: [],
    savedMedia: [],
    ...overrides,
  }
}

describe('collectDnaSources legacy identity compatibility', () => {
  it('derives missing rating identity from a canonical document id', () => {
    const items = collectDnaSources(snapshot({
      ratings: [
        {
          id: 'movie_42',
          score: 8,
        },
      ],
    }))

    assert.equal(items.length, 1)
    assert.equal(items[0].mediaKey, 'movie_42')
    assert.equal(items[0].mediaType, 'movie')
    assert.equal(items[0].tmdbId, 42)
    assert.equal(items[0].rating, 8)
  })

  it('derives missing favorite identity from a canonical document id', () => {
    const items = collectDnaSources(snapshot({
      savedMedia: [
        {
          id: 'tv_77',
          favorite: true,
        },
      ],
    }))

    assert.equal(items.length, 1)
    assert.equal(items[0].mediaKey, 'tv_77')
    assert.equal(items[0].mediaType, 'tv')
    assert.equal(items[0].tmdbId, 77)
    assert.equal(items[0].favorite, true)
  })

  it('continues reading legacy numeric onboarding ids without duplicated identity fields', () => {
    const items = collectDnaSources(snapshot({
      onboardingResponses: [
        {
          id: '99',
          reaction: 'like',
        },
      ],
    }))

    assert.equal(items.length, 1)
    assert.equal(items[0].mediaKey, 'movie_99')
    assert.equal(items[0].mediaType, 'movie')
    assert.equal(items[0].tmdbId, 99)
    assert.equal(items[0].onboardingReaction, 'like')
  })

  it('still rejects explicit identity conflicts', () => {
    assert.throws(
      () => collectDnaSources(snapshot({
        ratings: [
          {
            id: 'movie_42',
            mediaType: 'tv',
            tmdbId: 42,
            score: 8,
          },
        ],
      })),
      error => error?.code === SERVER_ERROR_CODES.INVALID_SOURCE,
    )
  })
})
