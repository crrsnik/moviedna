import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  createNotificationService,
  normalizeNotificationSnapshot,
} from '../../src/features/notifications/services/createNotificationService.js'

function notificationSnapshot(
  overrides = {},
) {
  const data = {
    schemaVersion: 1,
    type: 'friend_request',
    actorUid: 'bob',
    entityId: 'friendship-1',
    metadata: {},
    createdAt: {
      seconds: 1,
    },
    readAt: null,
    ...overrides,
  }

  return {
    id: 'friend-request__friendship-1',
    ref: {
      path:
        'users/alice/notifications/'
        + 'friend-request__friendship-1',
    },
    exists: () => true,
    data: () => data,
  }
}

function createHarness({
  realtimeDocs = [
    notificationSnapshot(),
  ],
  unreadPages = [],
} = {}) {
  const calls = {
    subscription: null,
    updates: [],
    batchUpdates: [],
    batchCommits: 0,
    unsubscribed: false,
  }

  const timestamp = {
    seconds: 999,
  }

  const auth = {
    currentUser: {
      uid: 'alice',
    },
  }

  const unreadQueue = [...unreadPages]

  const collection = (
    _db,
    ...segments
  ) => ({
    kind: 'collection',
    segments,
  })

  const doc = (
    _db,
    ...segments
  ) => ({
    kind: 'doc',
    path: segments.join('/'),
  })

  const query = (...parts) => ({
    kind: 'query',
    parts,
  })

  const orderBy = (
    field,
    direction,
  ) => ({
    kind: 'orderBy',
    field,
    direction,
  })

  const limit = value => ({
    kind: 'limit',
    value,
  })

  const where = (
    field,
    operator,
    value,
  ) => ({
    kind: 'where',
    field,
    operator,
    value,
  })

  const onSnapshot = (
    subscription,
    onValue,
  ) => {
    calls.subscription = subscription

    onValue({
      docs: realtimeDocs,
    })

    return () => {
      calls.unsubscribed = true
    }
  }

  const updateDoc = async (
    ref,
    data,
  ) => {
    calls.updates.push({
      ref,
      data,
    })
  }

  const getDocs = async () => {
    const docs = unreadQueue.shift() ?? []

    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
    }
  }

  const writeBatch = () => ({
    update(ref, data) {
      calls.batchUpdates.push({
        ref,
        data,
      })
    },

    async commit() {
      calls.batchCommits += 1
    },
  })

  const service = createNotificationService({
    auth,
    db: {},
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp: () => timestamp,
    updateDoc,
    where,
    writeBatch,
  })

  return {
    auth,
    calls,
    service,
    timestamp,
  }
}

describe('notification service', () => {
  it('normalizes a valid notification', () => {
    const result =
      normalizeNotificationSnapshot(
        notificationSnapshot(),
      )

    assert.equal(
      result.id,
      'friend-request__friendship-1',
    )
    assert.equal(
      result.type,
      'friend_request',
    )
    assert.equal(
      result.actorUid,
      'bob',
    )
    assert.equal(
      result.readAt,
      null,
    )
  })

  it('rejects invalid notification data', () => {
    assert.throws(
      () => normalizeNotificationSnapshot(
        notificationSnapshot({
          schemaVersion: 2,
        }),
      ),
      {
        code: 'notification/invalid-data',
      },
    )

    assert.throws(
      () => normalizeNotificationSnapshot(
        notificationSnapshot({
          type: 'achievement_unlocked',
          actorUid: 'bob',
        }),
      ),
      {
        code: 'notification/invalid-data',
      },
    )
  })

  it('subscribes to newest 50 notifications', () => {
    const {
      service,
      calls,
    } = createHarness()

    let received = null

    const unsubscribe =
      service.subscribeToNotifications(
        notifications => {
          received = notifications
        },
      )

    assert.equal(received.length, 1)

    assert.deepEqual(
      calls.subscription.parts[0],
      {
        kind: 'collection',
        segments: [
          'users',
          'alice',
          'notifications',
        ],
      },
    )

    assert.deepEqual(
      calls.subscription.parts[1],
      {
        kind: 'orderBy',
        field: 'createdAt',
        direction: 'desc',
      },
    )

    assert.deepEqual(
      calls.subscription.parts[2],
      {
        kind: 'limit',
        value: 50,
      },
    )

    unsubscribe()

    assert.equal(
      calls.unsubscribed,
      true,
    )
  })

  it('marks one notification as read', async () => {
    const {
      service,
      calls,
      timestamp,
    } = createHarness()

    await service.markAsRead(
      'friend-request__friendship-1',
    )

    assert.deepEqual(
      calls.updates,
      [
        {
          ref: {
            kind: 'doc',
            path:
              'users/alice/notifications/'
              + 'friend-request__friendship-1',
          },
          data: {
            readAt: timestamp,
          },
        },
      ],
    )
  })

  it('marks one notification as unread', async () => {
    const {
      service,
      calls,
    } = createHarness()

    await service.markAsUnread(
      'friend-request__friendship-1',
    )

    assert.equal(
      calls.updates[0].data.readAt,
      null,
    )
  })

  it('marks all unread notifications across batches', async () => {
    const first = notificationSnapshot()
    const second = notificationSnapshot({
      type: 'friend_accepted',
    })

    second.id =
      'friend-accepted__friendship-2'
    second.ref = {
      path:
        'users/alice/notifications/'
        + second.id,
    }

    const {
      service,
      calls,
      timestamp,
    } = createHarness({
      unreadPages: [
        [first, second],
        [],
      ],
    })

    const count =
      await service.markAllAsRead()

    assert.equal(count, 2)
    assert.equal(
      calls.batchCommits,
      1,
    )
    assert.equal(
      calls.batchUpdates.length,
      2,
    )

    assert.ok(
      calls.batchUpdates.every(
        entry => entry.data.readAt === timestamp,
      ),
    )
  })

  it('rejects notification actions without auth', async () => {
    const {
      auth,
      service,
    } = createHarness()

    auth.currentUser = null

    await assert.rejects(
      service.markAsRead(
        'friend-request__friendship-1',
      ),
      {
        code: 'notification/unauthenticated',
      },
    )
  })
})
