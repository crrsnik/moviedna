import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildAchievementDocument,
} from '../src/achievements/achievementDocument.js'

function evaluation(states) {
  return {
    schemaVersion: 1,
    totalCount: states.length,
    achievements: states,
  }
}

function state(
  id,
  {
    current = 0,
    target = 10,
    unlocked = false,
  } = {},
) {
  return {
    id,
    category: 'test',
    displayOrder: 10,
    current,
    target,
    unlocked,
  }
}

describe('achievement document', () => {
  it('assigns unlockedAt when an achievement unlocks', () => {
    let counter = 0

    const result = buildAchievementDocument({
      evaluation: evaluation([
        state('first', {
          current: 10,
          unlocked: true,
        }),
      ]),
      serverTimestamp: () => `stamp-${++counter}`,
    })

    assert.equal(
      result.achievements.first.unlocked,
      true,
    )

    assert.equal(
      result.achievements.first.unlockedAt,
      'stamp-1',
    )

    assert.equal(result.completedCount, 1)
    assert.equal(result.updatedAt, 'stamp-2')
  })

  it('preserves the original unlockedAt timestamp', () => {
    const original = {
      seconds: 123,
      nanoseconds: 456,
    }

    const result = buildAchievementDocument({
      evaluation: evaluation([
        state('first', {
          current: 10,
          unlocked: true,
        }),
      ]),
      previousAchievements: {
        first: {
          unlocked: true,
          unlockedAt: original,
        },
      },
      serverTimestamp: () => 'new-stamp',
    })

    assert.equal(
      result.achievements.first.unlockedAt,
      original,
    )
  })

  it('never revokes an already unlocked achievement', () => {
    const result = buildAchievementDocument({
      evaluation: evaluation([
        state('first', {
          current: 2,
          unlocked: true,
        }),
      ]),
      previousAchievements: {
        first: {
          unlocked: true,
          unlockedAt: 'original-stamp',
        },
      },
      serverTimestamp: () => 'new-stamp',
    })

    assert.equal(
      result.achievements.first.current,
      2,
    )

    assert.equal(
      result.achievements.first.unlocked,
      true,
    )

    assert.equal(
      result.achievements.first.unlockedAt,
      'original-stamp',
    )
  })

  it('keeps locked achievements without unlockedAt', () => {
    const result = buildAchievementDocument({
      evaluation: evaluation([
        state('first', {
          current: 4,
          unlocked: false,
        }),
      ]),
      serverTimestamp: () => 'stamp',
    })

    assert.equal(
      result.achievements.first.unlocked,
      false,
    )

    assert.equal(
      result.achievements.first.unlockedAt,
      null,
    )

    assert.equal(result.completedCount, 0)
  })

  it('recomputes completedCount from persisted state', () => {
    const result = buildAchievementDocument({
      evaluation: evaluation([
        state('first', {
          unlocked: true,
        }),
        {
          ...state('second', {
            unlocked: false,
          }),
          displayOrder: 20,
        },
      ]),
      previousAchievements: {
        second: {
          unlocked: true,
          unlockedAt: 'old',
        },
      },
      serverTimestamp: () => 'stamp',
    })

    assert.equal(result.completedCount, 2)
    assert.equal(result.totalCount, 2)
  })
})
