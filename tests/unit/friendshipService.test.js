import assert from 'node:assert/strict'
import {
  beforeEach,
  describe,
  it,
} from 'node:test'

import {
  createFriendshipService,
} from '../../src/features/friends/services/createFriendshipService.js'

const auth = {
  currentUser: {
    uid: 'alice',
  },
}

const db = {}

let calls
let nextSnapshot
let snapshotListener
let snapshotErrorListener

function ref(path) {
  return { path }
}

const dependencies = {
  auth,
  db,

  collection(_db, ...path) {
    const result = ref(path.join('/'))
    calls.push(['collection', result.path])
    return result
  },

  deleteDoc(documentRef) {
    calls.push(['deleteDoc', documentRef.path])
    return Promise.resolve()
  },

  doc(_db, ...path) {
    const result = ref(path.join('/'))
    calls.push(['doc', result.path])
    return result
  },

  getDoc(documentRef) {
    calls.push(['getDoc', documentRef.path])
    return Promise.resolve(nextSnapshot)
  },

  onSnapshot(
    source,
    onValue,
    onError,
  ) {
    calls.push(['onSnapshot', source])
    snapshotListener = onValue
    snapshotErrorListener = onError

    return () => {
      calls.push(['unsubscribe'])
    }
  },

  query(...parts) {
    const result = {
      type: 'query',
      parts,
    }

    calls.push(['query', result])
    return result
  },

  serverTimestamp() {
    return { __serverTimestamp: true }
  },

  setDoc(documentRef, data) {
    calls.push([
      'setDoc',
      documentRef.path,
      data,
    ])

    return Promise.resolve()
  },

  updateDoc(documentRef, data) {
    calls.push([
      'updateDoc',
      documentRef.path,
      data,
    ])

    return Promise.resolve()
  },

  where(field, operator, value) {
    const result = {
      type: 'where',
      field,
      operator,
      value,
    }

    calls.push(['where', result])
    return result
  },

  cryptoImpl: globalThis.crypto,
  TextEncoderImpl: globalThis.TextEncoder,
}

function snapshot({
  id = 'friendship-id',
  exists = true,
  data = {},
} = {}) {
  return {
    id,
    exists: () => exists,
    data: () => data,
  }
}

function friendship(overrides = {}) {
  return {
    members: ['alice', 'bob'],
    requestedBy: 'alice',
    status: 'pending',
    createdAt: { seconds: 1 },
    updatedAt: { seconds: 2 },
    acceptedAt: null,
    ...overrides,
  }
}

describe(
  'Friendship service',
  { concurrency: false },
  () => {
    let service

    beforeEach(() => {
      calls = []
      nextSnapshot = null
      snapshotListener = null
      snapshotErrorListener = null
      auth.currentUser = {
        uid: 'alice',
      }

      service = createFriendshipService(
        dependencies,
      )
    })

    it('creates one canonical uppercase pair ID', async () => {
      const first = await service.getFriendshipId(
        'alice',
        'bob',
      )

      const second = await service.getFriendshipId(
        'bob',
        'alice',
      )

      assert.equal(first, second)
      assert.equal(
        first,
        '1E2AF26470AAE83866FD22E2907B8D1BE05975D952E4158989CBD18933BD703E',
      )
      assert.match(first, /^[A-F0-9]{64}$/)
    })

    it('creates a pending friend request', async () => {
      const friendshipId =
        await service.createFriendRequest('bob')

      const write = calls.find(
        ([name]) => name === 'setDoc',
      )

      assert.equal(
        write[1],
        `friendships/${friendshipId}`,
      )

      assert.deepEqual(
        write[2].members,
        ['alice', 'bob'],
      )
      assert.equal(
        write[2].requestedBy,
        'alice',
      )
      assert.equal(write[2].status, 'pending')
      assert.equal(write[2].acceptedAt, null)
      assert.deepEqual(
        write[2].createdAt,
        { __serverTimestamp: true },
      )
      assert.deepEqual(
        write[2].updatedAt,
        { __serverTimestamp: true },
      )
    })

    it('uses canonical member ordering', async () => {
      auth.currentUser = {
        uid: 'zeta',
      }

      await service.createFriendRequest('alpha')

      const write = calls.find(
        ([name]) => name === 'setDoc',
      )

      assert.deepEqual(
        write[2].members,
        ['alpha', 'zeta'],
      )
      assert.equal(
        write[2].requestedBy,
        'zeta',
      )
    })

    it('rejects a self request before Firestore access', async () => {
      await assert.rejects(
        service.createFriendRequest('alice'),
        {
          code: 'friendship/self-request',
        },
      )

      assert.equal(
        calls.some(
          ([name]) => name === 'setDoc',
        ),
        false,
      )
    })

    it('rejects unauthenticated actions', async () => {
      auth.currentUser = null

      await assert.rejects(
        service.createFriendRequest('bob'),
        {
          code: 'friendship/unauthenticated',
        },
      )
    })

    it('accepts a friend request', async () => {
      await service.acceptFriendRequest('bob')

      const update = calls.find(
        ([name]) => name === 'updateDoc',
      )

      assert.ok(update)
      assert.match(
        update[1],
        /^friendships\/[A-F0-9]{64}$/,
      )
      assert.equal(
        update[2].status,
        'accepted',
      )
      assert.deepEqual(
        update[2].acceptedAt,
        { __serverTimestamp: true },
      )
      assert.deepEqual(
        update[2].updatedAt,
        { __serverTimestamp: true },
      )
    })

    for (const action of [
      'cancelFriendRequest',
      'declineFriendRequest',
      'removeFriend',
    ]) {
      it(`${action} deletes the canonical friendship`, async () => {
        await service[action]('bob')

        const deletion = calls.find(
          ([name]) => name === 'deleteDoc',
        )

        assert.ok(deletion)
        assert.match(
          deletion[1],
          /^friendships\/[A-F0-9]{64}$/,
        )
      })
    }

    it('loads and normalizes an existing friendship', async () => {
      nextSnapshot = snapshot({
        id: 'ABC123',
        data: friendship(),
      })

      const result =
        await service.getFriendship('bob')

      assert.deepEqual(result, {
        id: 'ABC123',
        members: ['alice', 'bob'],
        requestedBy: 'alice',
        status: 'pending',
        createdAt: { seconds: 1 },
        updatedAt: { seconds: 2 },
        acceptedAt: null,
      })
    })

    it('returns null when no friendship exists', async () => {
      nextSnapshot = snapshot({
        exists: false,
      })

      assert.equal(
        await service.getFriendship('bob'),
        null,
      )
    })

    it('rejects malformed friendship data', async () => {
      nextSnapshot = snapshot({
        data: friendship({
          members: ['bob', 'alice'],
        }),
      })

      await assert.rejects(
        service.getFriendship('bob'),
        {
          code: 'friendship/invalid-data',
        },
      )
    })

    it('subscribes only to friendships containing the current user', () => {
      const values = []

      const unsubscribe =
        service.subscribeToFriendships(
          (value) => values.push(value),
        )

      const whereCall = calls.find(
        ([name]) => name === 'where',
      )

      assert.deepEqual(
        whereCall[1],
        {
          type: 'where',
          field: 'members',
          operator: 'array-contains',
          value: 'alice',
        },
      )

      snapshotListener({
        docs: [
          snapshot({
            id: 'ABC123',
            data: friendship(),
          }),
        ],
      })

      assert.equal(values.length, 1)
      assert.equal(
        values[0][0].id,
        'ABC123',
      )

      unsubscribe()

      assert.ok(
        calls.some(
          ([name]) => name === 'unsubscribe',
        ),
      )
    })

    it('sanitizes Firestore permission errors', async () => {
      dependencies.setDoc = async () => {
        throw {
          code: 'permission-denied',
          message: 'RAW_FIREBASE_MESSAGE',
        }
      }

      service = createFriendshipService(
        dependencies,
      )

      await assert.rejects(
        service.createFriendRequest('bob'),
        {
          code: 'friendship/permission-denied',
        },
      )

      dependencies.setDoc = (
        documentRef,
        data,
      ) => {
        calls.push([
          'setDoc',
          documentRef.path,
          data,
        ])
        return Promise.resolve()
      }
    })

    it('sanitizes subscription errors', () => {
      let receivedError = null

      service.subscribeToFriendships(
        () => {},
        (error) => {
          receivedError = error
        },
      )

      snapshotErrorListener({
        code: 'unavailable',
        message: 'RAW_FIREBASE_MESSAGE',
      })

      assert.equal(
        receivedError.code,
        'friendship/unavailable',
      )
    })
  },
)
