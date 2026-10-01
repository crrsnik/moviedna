import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const key = '__moviednaPublicProfileServiceTest'

const db = {}
let server
let getPublicProfileByUsername
let getPublicProfileByUserId
let calls
let responses

const stubs = {
  db,

  doc(_db, ...path) {
    const ref = path.join('/')
    calls.push(['doc', ref])
    return ref
  },

  async getDoc(ref) {
    calls.push(['getDoc', ref])

    const next = responses.shift()

    if (next?.throw) throw next.throw

    return next
  },
}

function snapshot(id, data, exists = true) {
  return {
    id,
    exists: () => exists,
    data: () => data,
  }
}

function publicProfile(overrides = {}) {
  return {
    userId: 'alice',
    username: 'alice_123',
    displayName: 'Alice',
    avatarId: 'avatar_01',
    profileVisibility: 'public',
    createdAt: { seconds: 1 },
    updatedAt: { seconds: 2 },
    ...overrides,
  }
}

describe('Public profile service', { concurrency: false }, () => {
  before(async () => {
    globalThis[key] = stubs

    server = await createServer({
      configFile: false,
      envFile: false,
      logLevel: 'silent',
      server: { middlewareMode: true },
      ssr: { noExternal: true },
      plugins: [{
        name: 'public-profile-test-firebase-boundaries',
        enforce: 'pre',

        resolveId(source, importer) {
          if (!importer?.endsWith('/publicProfileService.js')) return

          if (source === 'firebase/firestore') return '\0mock:firestore'

          if (source === '../../../shared/config/firebase.js') {
            return '\0mock:config'
          }
        },

        load(id) {
          if (id === '\0mock:firestore') {
            return `export const { doc, getDoc } = globalThis.${key}`
          }

          if (id === '\0mock:config') {
            return `export const db = globalThis.${key}.db`
          }
        },
      }],
    })

    const service = await server.ssrLoadModule(
      '/src/features/profile/services/publicProfileService.js',
    )

    getPublicProfileByUsername =
      service.getPublicProfileByUsername

    getPublicProfileByUserId =
      service.getPublicProfileByUserId
  })

  beforeEach(() => {
    calls = []
    responses = []
  })

  after(async () => {
    await server?.close()
    delete globalThis[key]
  })

  it('loads a safe public profile directly by user ID', async () => {
    responses = [
      snapshot('alice', publicProfile()),
    ]

    const result = await getPublicProfileByUserId(
      'alice',
    )

    assert.equal(result.userId, 'alice')
    assert.equal(result.username, 'alice_123')
    assert.equal(result.displayName, 'Alice')

    assert.deepEqual(
      calls,
      [
        ['doc', 'publicProfiles/alice'],
        ['getDoc', 'publicProfiles/alice'],
      ],
    )
  })

  it('rejects an invalid public-profile user ID', async () => {
    await assert.rejects(
      getPublicProfileByUserId('contains/slash'),
      {
        code: 'public-profile/invalid-user-id',
      },
    )

    assert.deepEqual(calls, [])
  })

  it('loads a public profile by username', async () => {
    responses = [
      snapshot('alice_123', {
        userId: 'alice',
      }),
      snapshot('alice', publicProfile()),
    ]

    const result = await getPublicProfileByUsername('Alice_123')

    assert.equal(result.kind, 'public')
    assert.equal(result.profile.displayName, 'Alice')
    assert.equal(result.profile.username, 'alice_123')
  })

  it('loads safe identity fields for a private profile', async () => {
    responses = [
      snapshot('alice_123', {
        userId: 'alice',
      }),
      snapshot(
        'alice',
        publicProfile({
          profileVisibility: 'private',
        }),
      ),
    ]

    const result = await getPublicProfileByUsername('alice_123')

    assert.equal(result.kind, 'private')
    assert.equal(result.profile.displayName, 'Alice')
    assert.equal(result.profile.username, 'alice_123')
    assert.equal(result.profile.avatarId, 'avatar_01')
  })

  it('returns not-found when the username does not exist', async () => {
    responses = [
      snapshot('missing_user', null, false),
    ]

    const result = await getPublicProfileByUsername('missing_user')

    assert.deepEqual(result, {
      kind: 'not-found',
      username: 'missing_user',
      profile: null,
    })
  })

  for (const username of [
    '',
    'ab',
    'UPPER CASE',
    'contains/slash',
    'a'.repeat(21),
  ]) {
    it(`rejects invalid username ${JSON.stringify(username)}`, async () => {
      await assert.rejects(
        getPublicProfileByUsername(username),
        {
          code: 'public-profile/invalid-username',
        },
      )

      assert.deepEqual(calls, [])
    })
  }

  it('rejects a mismatched public profile mirror', async () => {
    responses = [
      snapshot('alice_123', {
        userId: 'alice',
      }),
      snapshot(
        'alice',
        publicProfile({
          username: 'different_user',
        }),
      ),
    ]

    await assert.rejects(
      getPublicProfileByUsername('alice_123'),
      {
        code: 'public-profile/inconsistent',
      },
    )
  })

  it('sanitizes permission errors', async () => {
    responses = [{
      throw: {
        code: 'permission-denied',
        message: 'RAW_FIREBASE_MESSAGE',
      },
    }]

    await assert.rejects(
      getPublicProfileByUsername('alice_123'),
      {
        code: 'public-profile/permission-denied',
      },
    )
  })

  it('sanitizes Firestore availability errors', async () => {
    responses = [{
      throw: {
        code: 'unavailable',
        message: 'RAW_FIREBASE_MESSAGE',
      },
    }]

    await assert.rejects(
      getPublicProfileByUsername('alice_123'),
      {
        code: 'public-profile/unavailable',
      },
    )
  })
})
