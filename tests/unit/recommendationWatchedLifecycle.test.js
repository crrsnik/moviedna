import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  recommendationRevision,
} from '../../src/features/recommendations/hooks/recommendationLifecycle.js'

const dna = {
  current: {
    status: 'ready',
    updatedAt: '2026-10-02T07:00:00.000Z',
  },
}

describe('recommendation watched lifecycle', () => {
  it('keeps the legacy revision when nothing is watched', () => {
    assert.equal(
      recommendationRevision(
        'alice',
        dna,
        [],
      ),
      dna.current.updatedAt,
    )
  })

  it('changes revision when a title becomes watched', () => {
    const before = recommendationRevision(
      'alice',
      dna,
      [],
    )

    const after = recommendationRevision(
      'alice',
      dna,
      [{
        mediaType: 'movie',
        tmdbId: 123,
      }],
    )

    assert.notEqual(after, before)
    assert.match(after, /movie_123/)
  })

  it('is stable across watched ordering and duplicates', () => {
    const first = recommendationRevision(
      'alice',
      dna,
      [
        {
          mediaType: 'tv',
          tmdbId: 20,
        },
        {
          mediaType: 'movie',
          tmdbId: 10,
        },
      ],
    )

    const second = recommendationRevision(
      'alice',
      dna,
      [
        {
          mediaType: 'movie',
          tmdbId: 10,
        },
        {
          mediaType: 'tv',
          tmdbId: 20,
        },
        {
          mediaType: 'movie',
          tmdbId: 10,
        },
      ],
    )

    assert.equal(first, second)
  })

  it('changes again when another title becomes watched', () => {
    const one = recommendationRevision(
      'alice',
      dna,
      [{
        mediaType: 'movie',
        tmdbId: 10,
      }],
    )

    const two = recommendationRevision(
      'alice',
      dna,
      [
        {
          mediaType: 'movie',
          tmdbId: 10,
        },
        {
          mediaType: 'tv',
          tmdbId: 20,
        },
      ],
    )

    assert.notEqual(one, two)
  })
})
