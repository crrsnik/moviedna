import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createFriendshipNotificationHandler,
  friendshipNotificationForEvent,
} from '../src/notifications/friendshipNotificationHandler.js'

const snapshot = data => ({
  exists: data !== null,
  data: () => data,
})

function event(before, after) {
  return {
    id: 'friendship-event-1',
    params: {
      friendshipId: 'friendship-1',
    },
    data: {
      before: snapshot(before),
      after: snapshot(after),
    },
  }
}

const pending = {
  members: ['alice', 'bob'],
  requestedBy: 'alice',
  status: 'pending',
}

const accepted = {
  ...pending,
  status: 'accepted',
}

describe('friendship notification handler', () => {
  it('notifies recipient about a new request', () => {
    assert.deepEqual(
      friendshipNotificationForEvent(
        event(null, pending),
      ),
      {
        uid: 'bob',
        type: 'friend_request',
        actorUid: 'alice',
        entityId: 'friendship-1',
        occurrenceId:
          'friendship-event-1',
        metadata: {},
      },
    )
  })

  it('notifies requester when request is accepted', () => {
    assert.deepEqual(
      friendshipNotificationForEvent(
        event(pending, accepted),
      ),
      {
        uid: 'alice',
        type: 'friend_accepted',
        actorUid: 'bob',
        entityId: 'friendship-1',
        occurrenceId:
          'friendship-event-1',
        metadata: {},
      },
    )
  })

  it('ignores unrelated friendship writes', () => {
    assert.equal(
      friendshipNotificationForEvent(
        event(accepted, accepted),
      ),
      null,
    )

    assert.equal(
      friendshipNotificationForEvent(
        event(accepted, null),
      ),
      null,
    )
  })

  it('does not trust changed friendship identity', () => {
    assert.equal(
      friendshipNotificationForEvent(
        event(
          pending,
          {
            ...accepted,
            requestedBy: 'bob',
          },
        ),
      ),
      null,
    )
  })

  it('passes a classified notification to store', async () => {
    const calls = []

    const handler =
      createFriendshipNotificationHandler({
        notify: async notification => {
          calls.push(notification)

          return {
            status: 'created',
          }
        },
      })

    const result = await handler(
      event(null, pending),
    )

    assert.equal(result.status, 'processed')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].uid, 'bob')
  })
})
