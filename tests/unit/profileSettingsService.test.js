import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const key = '__moviednaProfileSettingsServiceTest'

const db = {}
let server
let updateProfileSettings
let calls
let sourceProfile
let transactionError

const stubs = {
  db,

  doc(_db, ...path) {
    calls.push(['doc', path.join('/')])
    return path.join('/')
  },

  serverTimestamp() {
    return 'SERVER_TIMESTAMP'
  },

  async runTransaction(receivedDb, callback) {
    assert.equal(receivedDb, db)
    calls.push(['transaction'])

    if (transactionError) throw transactionError

    return callback({
      async get(ref) {
        calls.push(['get', ref])

        return {
          exists: () => sourceProfile !== null,
          data: () => sourceProfile,
        }
      },

      update(ref, value) {
        calls.push(['update', ref, value])
      },

      set(ref, value) {
        calls.push(['set', ref, value])
      },
    })
  },
}

describe('Profile settings service', { concurrency: false }, () => {
  before(async () => {
    globalThis[key] = stubs

    server = await createServer({
      configFile: false,
      envFile: false,
      logLevel: 'silent',
      server: { middlewareMode: true },
      ssr: { noExternal: true },
      plugins: [{
        name: 'profile-settings-test-firebase-boundaries',
        enforce: 'pre',

        resolveId(source, importer) {
          if (!importer?.endsWith('/profileSettingsService.js')) return

          if (source === 'firebase/firestore') return '\0mock:firestore'
          if (source === '../../../shared/config/firebase.js') return '\0mock:config'
        },

        load(id) {
          if (id === '\0mock:firestore') {
            return `export const { doc, runTransaction, serverTimestamp } = globalThis.${key}`
          }

          if (id === '\0mock:config') {
            return `export const db = globalThis.${key}.db`
          }
        },
      }],
    })

    updateProfileSettings = (
      await server.ssrLoadModule(
        '/src/features/profile/services/profileSettingsService.js',
      )
    ).updateProfileSettings
  })

  beforeEach(() => {
    calls = []
    transactionError = null
    sourceProfile = {
      username: 'movie_fan',
      createdAt: 'CREATED_AT',
    }
  })

  after(async () => {
    await server?.close()
    delete globalThis[key]
  })

  it('normalizes displayName and updates both profile documents atomically', async () => {
    const result = await updateProfileSettings('demo-user', {
      displayName: '  Movie Fan  ',
      avatarId: 'avatar_08',
      profileVisibility: 'public',
    })

    assert.deepEqual(result, {
      displayName: 'Movie Fan',
      avatarId: 'avatar_08',
      profileVisibility: 'public',
    })

    assert.deepEqual(calls, [
      ['doc', 'users/demo-user'],
      ['doc', 'publicProfiles/demo-user'],
      ['transaction'],
      ['get', 'users/demo-user'],
      ['update', 'users/demo-user', {
        displayName: 'Movie Fan',
        avatarId: 'avatar_08',
        profileVisibility: 'public',
        updatedAt: 'SERVER_TIMESTAMP',
      }],
      ['set', 'publicProfiles/demo-user', {
        userId: 'demo-user',
        username: 'movie_fan',
        displayName: 'Movie Fan',
        avatarId: 'avatar_08',
        profileVisibility: 'public',
        createdAt: 'CREATED_AT',
        updatedAt: 'SERVER_TIMESTAMP',
      }],
    ])
  })

  for (const uid of [null, '', 'user/path']) {
    it(`rejects invalid uid ${JSON.stringify(uid)} before Firestore access`, async () => {
      await assert.rejects(
        updateProfileSettings(uid, {
          displayName: 'Movie Fan',
          avatarId: 'avatar_01',
          profileVisibility: 'private',
        }),
        { code: 'profile-settings/invalid-user' },
      )

      assert.deepEqual(calls, [])
    })
  }

  for (const input of [
    {
      displayName: '',
      avatarId: 'avatar_01',
      profileVisibility: 'private',
    },
    {
      displayName: 'a'.repeat(51),
      avatarId: 'avatar_01',
      profileVisibility: 'private',
    },
    {
      displayName: 'Movie Fan',
      avatarId: 'avatar_99',
      profileVisibility: 'private',
    },
    {
      displayName: 'Movie Fan',
      avatarId: 'avatar_01',
      profileVisibility: 'friends',
    },
  ]) {
    it(`rejects invalid settings ${JSON.stringify(input)}`, async () => {
      await assert.rejects(
        updateProfileSettings('demo-user', input),
        { code: 'profile-settings/invalid-input' },
      )

      assert.deepEqual(calls, [])
    })
  }

  it('rejects a missing private profile without scheduling writes', async () => {
    sourceProfile = null

    await assert.rejects(
      updateProfileSettings('demo-user', {
        displayName: 'Movie Fan',
        avatarId: 'avatar_01',
        profileVisibility: 'private',
      }),
      { code: 'profile-settings/missing-profile' },
    )

    assert.ok(!calls.some(([type]) => type === 'update' || type === 'set'))
  })

  it('rejects malformed source profile without scheduling writes', async () => {
    sourceProfile = {
      username: '',
      createdAt: null,
    }

    await assert.rejects(
      updateProfileSettings('demo-user', {
        displayName: 'Movie Fan',
        avatarId: 'avatar_01',
        profileVisibility: 'private',
      }),
      { code: 'profile-settings/invalid-profile' },
    )

    assert.ok(!calls.some(([type]) => type === 'update' || type === 'set'))
  })

  it('sanitizes Firestore permission errors', async () => {
    transactionError = {
      code: 'permission-denied',
      message: 'RAW_FIREBASE_ERROR',
    }

    await assert.rejects(
      updateProfileSettings('demo-user', {
        displayName: 'Movie Fan',
        avatarId: 'avatar_01',
        profileVisibility: 'private',
      }),
      { code: 'profile-settings/permission-denied' },
    )
  })
})
