import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  createAccountDeletionService,
} from '../../src/features/auth/services/createAccountDeletionService.js'

function fixture() {
  const calls = []

  const user = {
    uid: 'alice',
    email: 'alice@example.com',

    async getIdToken(force) {
      calls.push([
        'token',
        force,
      ])

      return 'fresh-token'
    },
  }

  const auth = {
    currentUser: user,
  }

  let reauthError = null
  let callableError = null
  let callableResult = {
    data: {
      deleted: true,
    },
  }

  const service = createAccountDeletionService({
    auth,

    functions: {
      name: 'functions',
    },

    credential(email, password) {
      calls.push([
        'credential',
        email,
        password,
      ])

      return {
        email,
        password,
      }
    },

    async reauthenticate(
      account,
      credential,
    ) {
      calls.push([
        'reauthenticate',
        account.uid,
        credential.password,
      ])

      if (reauthError) {
        throw reauthError
      }
    },

    createCallable(
      functions,
      name,
    ) {
      calls.push([
        'callable',
        functions.name,
        name,
      ])

      return async payload => {
        calls.push([
          'invoke',
          payload,
        ])

        if (callableError) {
          throw callableError
        }

        return callableResult
      }
    },

    async signOutUser() {
      calls.push([
        'signout',
      ])
    },
  })

  return {
    auth,
    calls,
    service,

    setReauthError(error) {
      reauthError = error
    },

    setCallableError(error) {
      callableError = error
    },

    setCallableResult(value) {
      callableResult = value
    },
  }
}

describe('account deletion service', () => {
  it(
    'reauthenticates, refreshes token, deletes and signs out',
    async () => {
      const f = fixture()

      assert.equal(
        await f.service.deleteAccount(
          'secret',
        ),
        true,
      )

      assert.deepEqual(
        f.calls,
        [
          [
            'credential',
            'alice@example.com',
            'secret',
          ],
          [
            'reauthenticate',
            'alice',
            'secret',
          ],
          [
            'token',
            true,
          ],
          [
            'callable',
            'functions',
            'deleteAccount',
          ],
          [
            'invoke',
            {
              confirm: true,
            },
          ],
          [
            'signout',
          ],
        ],
      )
    },
  )

  it(
    'rejects empty password before Firebase',
    async () => {
      const f = fixture()

      await assert.rejects(
        f.service.deleteAccount(''),
        {
          code: 'password-required',
        },
      )

      assert.deepEqual(
        f.calls,
        [],
      )
    },
  )

  it(
    'requires an authenticated email user',
    async () => {
      const f = fixture()
      f.auth.currentUser = null

      await assert.rejects(
        f.service.deleteAccount(
          'secret',
        ),
        {
          code: 'unauthenticated',
        },
      )

      assert.deepEqual(
        f.calls,
        [],
      )
    },
  )

  it(
    'maps a wrong password safely',
    async () => {
      const f = fixture()

      f.setReauthError({
        code: 'auth/invalid-credential',
      })

      await assert.rejects(
        f.service.deleteAccount(
          'wrong',
        ),
        {
          code: 'wrong-password',
        },
      )

      assert.equal(
        f.calls.some(
          ([name]) => name === 'invoke',
        ),
        false,
      )
    },
  )

  it(
    'maps a stale server session safely',
    async () => {
      const f = fixture()

      f.setCallableError({
        code: 'functions/failed-precondition',
      })

      await assert.rejects(
        f.service.deleteAccount(
          'secret',
        ),
        {
          code: 'recent-login-required',
        },
      )

      assert.equal(
        f.calls.some(
          ([name]) => name === 'signout',
        ),
        false,
      )
    },
  )

  it(
    'does not accept malformed callable success',
    async () => {
      const f = fixture()

      f.setCallableResult({
        data: {
          deleted: false,
        },
      })

      await assert.rejects(
        f.service.deleteAccount(
          'secret',
        ),
        {
          code: 'unknown',
        },
      )
    },
  )
})
