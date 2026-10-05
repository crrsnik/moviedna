import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createFirestoreAccountDeletionStore,
} from '../src/accountDeletion/firestoreAccountDeletionStore.js'

function createFakeFirestore() {
  const calls = {
    recursiveDelete: [],
    deletedDocuments: [],
    batchDeletes: [],
  }

  const notificationsCollection = {
    path: 'users/alice/notifications',
  }

  let userListCollectionsCalls = 0

  const userRef = {
    path: 'users/alice',

    async listCollections() {
      userListCollectionsCalls += 1

      // First pass discovers notifications.
      // Final idempotency sweep finds nothing.
      return userListCollectionsCalls === 1
        ? [notificationsCollection]
        : []
    },

    async delete() {
      calls.deletedDocuments.push(
        'users/alice',
      )
    },
  }

  const publicBoardsRef = {
    path: 'publicBoards/alice',

    async listCollections() {
      return []
    },

    async delete() {
      calls.deletedDocuments.push(
        'publicBoards/alice',
      )
    },
  }

  const simpleDocument = path => ({
    path,
  })

  const emptyQuery = {
    async get() {
      return {
        docs: [],
      }
    },
  }

  const db = {
    collection(name) {
      if (name === 'users') {
        return {
          doc(uid) {
            assert.equal(uid, 'alice')
            return userRef
          },
        }
      }

      if (
        name === 'usernames'
        || name === 'friendships'
      ) {
        return {
          where() {
            return emptyQuery
          },
        }
      }

      if (name === 'publicBoards') {
        return {
          doc(uid) {
            assert.equal(uid, 'alice')
            return publicBoardsRef
          },
        }
      }

      if (
        name === 'publicProfiles'
        || name === 'publicProfilePreviews'
      ) {
        return {
          doc(uid) {
            return simpleDocument(
              `${name}/${uid}`,
            )
          },
        }
      }

      throw new Error(
        `Unexpected collection: ${name}`,
      )
    },

    collectionGroup(name) {
      assert.equal(name, 'comments')

      return emptyQuery
    },

    async recursiveDelete(collection) {
      calls.recursiveDelete.push(
        collection.path,
      )
    },

    batch() {
      const refs = []

      return {
        delete(ref) {
          refs.push(ref.path)
        },

        async commit() {
          calls.batchDeletes.push(
            ...refs,
          )
        },
      }
    },
  }

  return {
    db,
    calls,
  }
}

describe(
  'firestore account deletion store',
  () => {
    it(
      'recursively deletes notification subcollections',
      async () => {
        const {
          db,
          calls,
        } = createFakeFirestore()

        const store =
          createFirestoreAccountDeletionStore(
            db,
          )

        await store.deleteUserData('alice')

        assert.deepEqual(
          calls.recursiveDelete,
          [
            'users/alice/notifications',
          ],
        )

        assert.ok(
          calls.deletedDocuments.includes(
            'users/alice',
          ),
        )

        assert.equal(
          calls.recursiveDelete.includes(
            'users/bob/notifications',
          ),
          false,
        )
      },
    )
  },
)
