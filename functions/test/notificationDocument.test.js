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
        'event-1',
      ),
      createNotificationId(
        'friend_request',
        'friendship-1',
        'event-1',
      ),
    )

    assert.equal(
      createNotificationId(
        'friend_accepted',
        'friendship-1',
        'event-2',
      ),
      createNotificationId(
        'friend_accepted',
        'friendship-1',
        'event-2',
      ),
    )

    assert.equal(
      createNotificationId(
        'achievement_unlocked',
        'rating_10',
        'event-3',
      ),
      createNotificationId(
        'achievement_unlocked',
        'rating_10',
        'event-3',
      ),
    )
  })

  it('builds immutable notification content', () => {
    const timestamp = Symbol('timestamp')

    const result = buildNotificationDocument({
      type: 'friend_request',
      actorUid: 'bob',
      entityId: 'friendship-1',
      metadata: {},
      occurrenceId: 'event-1',
      serverTimestamp: () => timestamp,
    })

    assert.equal(
      result.id,
      createNotificationId(
        'friend_request',
        'friendship-1',
        'event-1',
      ),
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
        occurrenceId: 'event-1',
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
        occurrenceId: 'event-1',
        serverTimestamp: () => null,
      }),
      /requires an actor/,
    )
  })

  it('creates different ids for repeated real-world events', () => {
    const first = createNotificationId(
      'friend_request',
      'same-friendship',
      'cloud-event-1',
    )

    const retry = createNotificationId(
      'friend_request',
      'same-friendship',
      'cloud-event-1',
    )

    const secondRequest =
      createNotificationId(
        'friend_request',
        'same-friendship',
        'cloud-event-2',
      )

    assert.equal(first, retry)
    assert.notEqual(
      first,
      secondRequest,
    )
  })

  it('rejects unsupported types and unsafe ids', () => {
    assert.throws(
      () => createNotificationId(
        'unknown',
        'entity',
        'event-1',
      ),
      /Invalid notification identity/,
    )

    assert.throws(
      () => createNotificationId(
        'friend_request',
        'unsafe/id',
        'event-1',
      ),
      /Invalid notification identity/,
    )
  })
})
