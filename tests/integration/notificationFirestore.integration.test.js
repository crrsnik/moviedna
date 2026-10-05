import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import {
  after,
  before,
  beforeEach,
  describe,
  it,
} from 'node:test'

import {
  assertFails,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

import {
  createNotificationService,
} from '../../src/features/notifications/services/createNotificationService.js'

const projectId = 'demo-moviedna'

let testEnv

function notificationData({
  type = 'friend_request',
  actorUid = 'bob',
  entityId = 'friendship-1',
  readAt = null,
} = {}) {
  return {
    schemaVersion: 1,
    type,
    actorUid,
    entityId,
    metadata:
      type === 'achievement_unlocked'
        ? {
            achievementId: entityId,
          }
        : {},
    createdAt: Timestamp.fromMillis(1_000),
    readAt,
  }
}

async function seedNotification(
  id,
  data = notificationData(),
) {
  await testEnv.withSecurityRulesDisabled(
    async context => {
      await setDoc(
        doc(
          context.firestore(),
          'users',
          'alice',
          'notifications',
          id,
        ),
        data,
      )
    },
  )
}

function createAliceService() {
  const auth = {
    currentUser: {
      uid: 'alice',
    },
  }

  const db = testEnv
    .authenticatedContext('alice')
    .firestore()

  return {
    db,
    service: createNotificationService({
      auth,
      db,
      collection,
      doc,
      getDocs,
      limit,
      onSnapshot,
      orderBy,
      query,
      serverTimestamp,
      updateDoc,
      where,
      writeBatch,
    }),
  }
}

describe(
  'notification service + Firestore rules',
  { concurrency: false },
  () => {
    before(async () => {
      testEnv = await initializeTestEnvironment({
        projectId,
        firestore: {
          host: '127.0.0.1',
          port: 8080,
          rules: await readFile(
            new URL(
              '../../firestore.rules',
              import.meta.url,
            ),
            'utf8',
          ),
        },
      })
    })

    beforeEach(async () => {
      await testEnv.clearFirestore()
    })

    after(async () => {
      await testEnv?.cleanup()
    })

    it(
      'marks a backend-created notification as read and unread',
      async () => {
        const id =
          'friend-request__friendship-1'

        await seedNotification(id)

        const {
          db,
          service,
        } = createAliceService()

        const ref = doc(
          db,
          'users',
          'alice',
          'notifications',
          id,
        )

        await service.markAsRead(id)

        let snapshot = await getDoc(ref)

        assert.ok(
          snapshot.data().readAt instanceof Timestamp,
        )

        await service.markAsUnread(id)

        snapshot = await getDoc(ref)

        assert.equal(
          snapshot.data().readAt,
          null,
        )
      },
    )

    it(
      'marks every unread notification as read',
      async () => {
        await seedNotification(
          'friend-request__friendship-1',
          notificationData({
            entityId: 'friendship-1',
          }),
        )

        await seedNotification(
          'friend-accepted__friendship-2',
          notificationData({
            type: 'friend_accepted',
            actorUid: 'charlie',
            entityId: 'friendship-2',
          }),
        )

        const alreadyRead =
          Timestamp.fromMillis(2_000)

        await seedNotification(
          'achievement-unlocked__rating_10',
          notificationData({
            type: 'achievement_unlocked',
            actorUid: null,
            entityId: 'rating_10',
            readAt: alreadyRead,
          }),
        )

        const {
          db,
          service,
        } = createAliceService()

        const count =
          await service.markAllAsRead()

        assert.equal(count, 2)

        const snapshot = await getDocs(
          collection(
            db,
            'users',
            'alice',
            'notifications',
          ),
        )

        assert.equal(snapshot.size, 3)

        const byId = Object.fromEntries(
          snapshot.docs.map(document => [
            document.id,
            document.data(),
          ]),
        )

        assert.ok(
          byId[
            'friend-request__friendship-1'
          ].readAt instanceof Timestamp,
        )

        assert.ok(
          byId[
            'friend-accepted__friendship-2'
          ].readAt instanceof Timestamp,
        )

        assert.ok(
          byId[
            'achievement-unlocked__rating_10'
          ].readAt.isEqual(alreadyRead),
        )
      },
    )

    it(
      'still prevents client notification creation',
      async () => {
        const {
          db,
        } = createAliceService()

        await assertFails(
          setDoc(
            doc(
              db,
              'users',
              'alice',
              'notifications',
              'client-created',
            ),
            notificationData(),
          ),
        )
      },
    )

    it(
      'still prevents notification content tampering',
      async () => {
        const id =
          'friend-request__friendship-1'

        await seedNotification(id)

        const {
          db,
        } = createAliceService()

        await assertFails(
          updateDoc(
            doc(
              db,
              'users',
              'alice',
              'notifications',
              id,
            ),
            {
              type: 'friend_accepted',
            },
          ),
        )
      },
    )
  },
)
