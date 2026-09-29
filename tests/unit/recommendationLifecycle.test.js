import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  recommendationRevision,
} from '../../src/features/recommendations/hooks/recommendationLifecycle.js'

function current(updatedAt) {
  return {
    status: 'ready',
    updatedAt,
  }
}

describe('recommendation DNA lifecycle', () => {
  it('keeps the same revision while recalculation is stale', () => {
    const updatedAt =
      '2026-09-29T12:00:00.000Z'

    const ready = {
      kind: 'ready',
      current: current(updatedAt),
    }

    const stale = {
      kind: 'stale',
      current: current(updatedAt),
      recalculation: {
        status: 'running',
      },
    }

    assert.equal(
      recommendationRevision(
        'user-a',
        ready,
      ),
      updatedAt,
    )

    assert.equal(
      recommendationRevision(
        'user-a',
        stale,
      ),
      updatedAt,
    )
  })

  it('changes revision only after a new MovieDNA document is observed', () => {
    const stale = {
      kind: 'stale',
      current: current(
        '2026-09-29T12:00:00.000Z',
      ),
    }

    const refreshed = {
      kind: 'ready',
      current: current(
        '2026-09-29T12:01:00.000Z',
      ),
    }

    assert.notEqual(
      recommendationRevision(
        'user-a',
        stale,
      ),
      recommendationRevision(
        'user-a',
        refreshed,
      ),
    )
  })

  it('does not create a recommendation revision before ready DNA exists', () => {
    assert.equal(
      recommendationRevision(
        'user-a',
        {
          kind: 'running',
          current: null,
        },
      ),
      null,
    )

    assert.equal(
      recommendationRevision(
        'user-a',
        {
          kind: 'insufficient',
          current: {
            status: 'insufficient-data',
            updatedAt:
              '2026-09-29T12:00:00.000Z',
          },
        },
      ),
      null,
    )

    assert.equal(
      recommendationRevision(
        null,
        {
          kind: 'ready',
          current: current(
            '2026-09-29T12:00:00.000Z',
          ),
        },
      ),
      null,
    )
  })
})
