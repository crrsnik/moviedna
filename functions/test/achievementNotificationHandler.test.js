import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createAchievementNotificationHandler,
  newlyUnlockedAchievementIds,
} from '../src/notifications/achievementNotificationHandler.js'

const snapshot = data => ({
  exists: data !== null,
  data: () => data,
})

function event(before, after) {
  return {
    params: {
      uid: 'alice',
    },
    data: {
      before: snapshot(before),
      after: snapshot(after),
    },
  }
}

function achievements(values) {
  return {
    achievements: values,
  }
}

describe('achievement notification handler', () => {
  it('finds only locked to unlocked transitions', () => {
    const before = achievements({
      rating_1: {
        unlocked: true,
      },
      rating_10: {
        unlocked: false,
      },
      watch_10: {
        unlocked: false,
      },
    })

    const after = achievements({
      rating_1: {
        unlocked: true,
      },
      rating_10: {
        unlocked: true,
      },
      watch_10: {
        unlocked: false,
      },
    })

    assert.deepEqual(
      newlyUnlockedAchievementIds(
        event(before, after),
      ),
      ['rating_10'],
    )
  })

  it('detects unlocked achievements on initial snapshot', () => {
    const after = achievements({
      rating_1: {
        unlocked: true,
      },
      rating_10: {
        unlocked: false,
      },
    })

    assert.deepEqual(
      newlyUnlockedAchievementIds(
        event(null, after),
      ),
      ['rating_1'],
    )
  })

  it('creates one notification per new achievement', async () => {
    const calls = []

    const handler =
      createAchievementNotificationHandler({
        notify: async notification => {
          calls.push(notification)

          return {
            status: 'created',
          }
        },
      })

    const result = await handler(
      event(
        achievements({
          rating_10: {
            unlocked: false,
          },
          watch_10: {
            unlocked: false,
          },
        }),
        achievements({
          rating_10: {
            unlocked: true,
          },
          watch_10: {
            unlocked: true,
          },
        }),
      ),
    )

    assert.equal(result.status, 'processed')
    assert.equal(calls.length, 2)

    assert.deepEqual(
      calls.map(call => call.entityId).sort(),
      ['rating_10', 'watch_10'],
    )

    assert.ok(
      calls.every(call => (
        call.uid === 'alice'
        && call.type === 'achievement_unlocked'
        && call.actorUid === null
      )),
    )
  })

  it('does nothing when no achievement is new', async () => {
    let calls = 0

    const handler =
      createAchievementNotificationHandler({
        notify: async () => {
          calls += 1
        },
      })

    const state = achievements({
      rating_1: {
        unlocked: true,
      },
    })

    const result = await handler(
      event(state, state),
    )

    assert.equal(result.status, 'ignored')
    assert.equal(calls, 0)
  })
})
