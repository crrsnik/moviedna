import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  createNotificationService,
} from '../../src/features/notifications/services/createNotificationService.js'

function snapshot(id) {
  return {
    id,
    exists: () => true,
    data: () => ({
      schemaVersion: 1,
      type: 'friend_request',
      actorUid: 'bob',
      entityId: `entity-${id}`,
      metadata: {},
      createdAt: {
        seconds: 1,
      },
      readAt: null,
    }),
  }
}

describe(
  'notification pagination service',
  () => {
    it(
      'loads pages using a document cursor',
      async () => {
        const calls = []

        const auth = {
          currentUser: {
            uid: 'alice',
          },
        }

        const first = snapshot('one')
        const second = snapshot('two')

        const getDocs = async queryValue => {
          calls.push(queryValue)

          return {
            docs: [
              first,
              second,
            ],
            size: 2,
          }
        }

        const service =
          createNotificationService({
            auth,
            db: {},
            collection: (
              _db,
              ...segments
            ) => ({
              kind: 'collection',
              segments,
            }),
            doc: () => ({}),
            getDocs,
            limit: value => ({
              kind: 'limit',
              value,
            }),
            onSnapshot: () => () => {},
            orderBy: (
              field,
              direction,
            ) => ({
              kind: 'orderBy',
              field,
              direction,
            }),
            query: (...parts) => ({
              parts,
            }),
            serverTimestamp:
              () => null,
            startAfter: cursor => ({
              kind: 'startAfter',
              cursor,
            }),
            updateDoc:
              async () => {},
            where: () => ({}),
            writeBatch:
              () => ({}),
          })

        const result =
          await service
            .loadNotificationsPage({
              pageSize: 2,
              cursor: first,
            })

        assert.equal(
          result.notifications.length,
          2,
        )

        assert.equal(
          result.cursor,
          second,
        )

        assert.equal(
          result.hasMore,
          true,
        )

        assert.deepEqual(
          calls[0].parts[1],
          {
            kind: 'orderBy',
            field: 'createdAt',
            direction: 'desc',
          },
        )

        assert.deepEqual(
          calls[0].parts[2],
          {
            kind: 'startAfter',
            cursor: first,
          },
        )

        assert.deepEqual(
          calls[0].parts[3],
          {
            kind: 'limit',
            value: 2,
          },
        )
      },
    )
  },
)
