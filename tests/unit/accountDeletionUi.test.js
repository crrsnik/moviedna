import assert from 'node:assert/strict'
import {
  readFile,
} from 'node:fs/promises'
import {
  describe,
  it,
} from 'node:test'

describe('account deletion UI contract', () => {
  it(
    'requires password and explicit irreversible confirmation',
    async () => {
      const page = await readFile(
        new URL(
          '../../src/pages/AccountSettingsPage.jsx',
          import.meta.url,
        ),
        'utf8',
      )

      assert.match(
        page,
        /type="password"/,
      )

      assert.match(
        page,
        /autoComplete="current-password"/,
      )

      assert.match(
        page,
        /type="checkbox"/,
      )

      assert.match(
        page,
        /deleteConfirmed/,
      )
    },
  )

  it(
    'uses the server-backed deletion service',
    async () => {
      const page = await readFile(
        new URL(
          '../../src/pages/AccountSettingsPage.jsx',
          import.meta.url,
        ),
        'utf8',
      )

      assert.match(
        page,
        /accountDeletionService/,
      )

      assert.match(
        page,
        /\.deleteAccount/,
      )
    },
  )

  it(
    'does not expose a direct client deleteUser call',
    async () => {
      const page = await readFile(
        new URL(
          '../../src/pages/AccountSettingsPage.jsx',
          import.meta.url,
        ),
        'utf8',
      )

      assert.doesNotMatch(
        page,
        /\bdeleteUser\b/,
      )
    },
  )
})
