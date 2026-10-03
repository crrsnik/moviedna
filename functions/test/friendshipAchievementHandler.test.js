import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  affectedFriendshipMembers,
  createFriendshipAchievementHandler,
} from '../src/achievements/friendshipAchievementHandler.js'

function snapshot(data) {
  return {
    data: () => data,
  }
}

function event({
  before = null,
  after = null,
} = {}) {
  return {
    data: {
      before: snapshot(before),
      after: snapshot(after),
    },
  }
}

describe('friendship achievement handler', () => {
  it('finds both affected users on creation', () => {
    assert.deepEqual(
      affectedFriendshipMembers(
        event({
          after: {
            members: ['alice', 'bob'],
            status: 'pending',
          },
        }),
      ),
      ['alice', 'bob'],
    )
  })

  it('finds both affected users on deletion', () => {
    assert.deepEqual(
      affectedFriendshipMembers(
        event({
          before: {
            members: ['alice', 'bob'],
            status: 'accepted',
          },
        }),
      ),
      ['alice', 'bob'],
    )
  })

  it('uses the union of before and after members safely', () => {
    assert.deepEqual(
      affectedFriendshipMembers(
        event({
          before: {
            members: ['alice', 'bob'],
          },
          after: {
            members: ['alice', 'carol'],
          },
        }),
      ),
      ['alice', 'bob', 'carol'],
    )
  })

  it('recalculates achievements for both active users', async () => {
    const calls = []

    const handler = createFriendshipAchievementHandler({
      userExists: async () => true,
      recalculate: async uid => {
        calls.push(uid)

        return {
          status: 'updated',
          uid,
        }
      },
    })

    const result = await handler(
      event({
        after: {
          members: ['alice', 'bob'],
          status: 'accepted',
        },
      }),
    )

    assert.deepEqual(calls, ['alice', 'bob'])

    assert.equal(
      result.users.alice.status,
      'updated',
    )

    assert.equal(
      result.users.bob.status,
      'updated',
    )
  })

  it('never recreates derived data for a deleted account', async () => {
    const calls = []

    const handler = createFriendshipAchievementHandler({
      userExists: async uid => uid !== 'alice',
      recalculate: async uid => {
        calls.push(uid)

        return {
          status: 'updated',
        }
      },
    })

    const result = await handler(
      event({
        before: {
          members: ['alice', 'bob'],
          status: 'accepted',
        },
      }),
    )

    assert.deepEqual(calls, ['bob'])

    assert.equal(
      result.users.alice.status,
      'account-deleted',
    )

    assert.equal(
      result.users.bob.status,
      'updated',
    )
  })

  it('ignores malformed friendship events', async () => {
    let called = false

    const handler = createFriendshipAchievementHandler({
      userExists: async () => true,
      recalculate: async () => {
        called = true
      },
    })

    const result = await handler(event())

    assert.equal(result.status, 'ignored')
    assert.equal(called, false)
  })
})
