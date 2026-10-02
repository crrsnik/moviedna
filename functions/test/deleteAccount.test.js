import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  createDeleteAccountHandler,
} from '../src/accountDeletion/deleteAccountHandler.js'

function request(overrides = {}) {
  return {
    auth: {
      uid: 'alice',
      token: {
        auth_time: 1_000,
      },
    },
    data: {
      confirm: true,
    },
    ...overrides,
  }
}

describe('delete account handler', () => {
  it(
    'deletes data before deleting Auth user',
    async () => {
      const calls = []

      const handler = createDeleteAccountHandler({
        now: () => 1_100_000,
        deleteUserData: async uid => {
          calls.push([
            'data',
            uid,
          ])
        },
        deleteAuthUser: async uid => {
          calls.push([
            'auth',
            uid,
          ])
        },
      })

      assert.deepEqual(
        await handler(request()),
        {
          deleted: true,
        },
      )

      assert.deepEqual(
        calls,
        [
          ['data', 'alice'],
          ['auth', 'alice'],
        ],
      )
    },
  )

  it(
    'rejects unauthenticated calls',
    async () => {
      const handler = createDeleteAccountHandler({
        deleteUserData: async () => {},
        deleteAuthUser: async () => {},
      })

      await assert.rejects(
        handler(
          request({
            auth: null,
          }),
        ),
        {
          code: 'unauthenticated',
        },
      )
    },
  )

  it(
    'requires exact confirmation payload',
    async () => {
      const handler = createDeleteAccountHandler({
        now: () => 1_100_000,
        deleteUserData: async () => {},
        deleteAuthUser: async () => {},
      })

      for (const data of [
        null,
        {},
        {
          confirm: false,
        },
        {
          confirm: true,
          extra: true,
        },
      ]) {
        await assert.rejects(
          handler(
            request({
              data,
            }),
          ),
          {
            code: 'invalid-argument',
          },
        )
      }
    },
  )

  it(
    'requires recent authentication',
    async () => {
      const handler = createDeleteAccountHandler({
        now: () => 2_000_000,
        deleteUserData: async () => {},
        deleteAuthUser: async () => {},
      })

      await assert.rejects(
        handler(request()),
        {
          code: 'failed-precondition',
        },
      )
    },
  )

  it(
    'never deletes Auth when data cleanup fails',
    async () => {
      let authDeleted = false

      const handler = createDeleteAccountHandler({
        now: () => 1_100_000,
        deleteUserData: async () => {
          throw new Error('private database error')
        },
        deleteAuthUser: async () => {
          authDeleted = true
        },
      })

      await assert.rejects(
        handler(request()),
        {
          code: 'internal',
        },
      )

      assert.equal(
        authDeleted,
        false,
      )
    },
  )

  it(
    'treats an already missing Auth user as deleted',
    async () => {
      const handler = createDeleteAccountHandler({
        now: () => 1_100_000,
        deleteUserData: async () => {},
        deleteAuthUser: async () => {
          const error = new Error()
          error.code = 'auth/user-not-found'
          throw error
        },
      })

      assert.deepEqual(
        await handler(request()),
        {
          deleted: true,
        },
      )
    },
  )
})
