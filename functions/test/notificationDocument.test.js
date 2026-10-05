import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildNotificationDocument,
  createNotificationId,
} from '../src/notifications/notificationDocument.js'

describe('notification document', () => {
  it('builds deterministic notification ids', () => {
    assert.equal(
      createNotificationId(
        'friend_request',
        'friendship-1',
      ),
      'friend-request__friendship-1',
    )

    assert.equal(
      createNotificationId(
        'friend_accepted',
        'friendship-1',
      ),
      'friend-accepted__friendship-1',
    )

    assert.equal(
      createNotificationId(
        'achievement_unlocked',
        'rating_10',
      ),
      'achievement-unlocked__rating_10',
    )
  })

  it('builds immutable notification content', () => {
    const timestamp = Symbol('timestamp')

    const result = buildNotificationDocument({
      type: 'friend_request',
      actorUid: 'bob',
      entityId: 'friendship-1',
      metadata: {},
      serverTimestamp: () => timestamp,
    })

    assert.equal(
      result.id,
      'friend-request__friendship-1',
    )

    assert.deepEqual(
      result.document,
      {
        schemaVersion: 1,
        type: 'friend_request',
        actorUid: 'bob',
        entityId: 'friendship-1',
        metadata: {},
        createdAt: timestamp,
        readAt: null,
      },
    )
  })

  it('requires null actor for achievements', () => {
    assert.throws(
      () => buildNotificationDocument({
        type: 'achievement_unlocked',
        actorUid: 'alice',
        entityId: 'rating_10',
        serverTimestamp: () => null,
      }),
      /actor must be null/,
    )
  })

  it('requires an actor for social notifications', () => {
    assert.throws(
      () => buildNotificationDocument({
        type: 'friend_request',
        actorUid: null,
        entityId: 'friendship-1',
        serverTimestamp: () => null,
      }),
      /requires an actor/,
    )
  })

  it('rejects unsupported types and unsafe ids', () => {
    assert.throws(
      () => createNotificationId(
        'unknown',
        'entity',
      ),
      /Invalid notification identity/,
    )

    assert.throws(
      () => createNotificationId(
        'friend_request',
        'unsafe/id',
      ),
      /Invalid notification identity/,
    )
  })
})
