import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Execute the real service with all Firebase boundaries replaced before loading it.
// No env file, app configuration, Auth account, or Firestore connection is used.
const key = '__moviednaRegistrationServiceTest'
const input = { username: ' Movie_Fan ', displayName: ' Movie Fan ', email: ' fan@example.invalid ', password: 'abcdefgh' }
let server, registerUser, calls, failure, existing, createdUser, transactionWrites
const auth = { currentUser: null }
const codedError = (code) => Object.assign(new Error('Do not expose this raw error'), { code })

const stubs = {
  auth, db: {},
  async createUserWithEmailAndPassword(receivedAuth, email, password) {
    calls.push('create')
    assert.equal(receivedAuth, auth)
    assert.equal(email, 'fan@example.invalid')
    assert.equal(password, input.password)
    if (failure.create) throw failure.create
    auth.currentUser = createdUser
    return { user: createdUser }
  },
  async updateProfile(user, data) {
    calls.push('updateProfile')
    assert.equal(user, createdUser)
    assert.deepEqual(data, { displayName: 'Movie Fan' })
    if (failure.update) throw failure.update
  },
  async deleteUser(user) {
    calls.push('deleteUser')
    assert.equal(user, createdUser)
    if (failure.delete) throw failure.delete
    auth.currentUser = null
  },
  async signOut(receivedAuth) {
    calls.push('signOut')
    assert.equal(receivedAuth, auth)
    if (failure.signOut) throw failure.signOut
    auth.currentUser = null
  },
  doc: (_db, ...path) => path.join('/'),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  async runTransaction(_db, callback) {
    calls.push('transaction')
    const result = await callback({
      async get(ref) {
        calls.push('get')
        assert.equal(ref, 'usernames/movie_fan')
        return { exists: () => existing }
      },
      set(ref, value) { transactionWrites.push([ref, value]) },
    })
    if (failure.transaction) throw failure.transaction
    calls.push('commit')
    return result
  },
}

describe('Registration service with mocked Firebase', { concurrency: false }, () => {
  before(async () => {
    globalThis[key] = stubs
    const modules = {
      'firebase/auth': ['createUserWithEmailAndPassword', 'updateProfile', 'deleteUser', 'signOut'],
      'firebase/firestore': ['runTransaction', 'doc', 'serverTimestamp'],
      '../../../shared/config/firebase.js': ['auth', 'db'],
    }
    server = await createServer({
      configFile: false, envFile: false, logLevel: 'silent',
      server: { middlewareMode: true }, ssr: { noExternal: true },
      plugins: [{
        name: 'registration-test-firebase-boundaries', enforce: 'pre',
        resolveId(source, importer) {
          if (importer?.endsWith('/registrationService.js') && Object.hasOwn(modules, source)) return `\0mock:${source}`
        },
        load(id) {
          if (id.startsWith('\0mock:')) {
            return modules[id.slice(6)].map((name) => `export const ${name} = globalThis.${key}.${name}`).join('\n')
          }
        },
      }],
    })
    const service = await server.ssrLoadModule('/src/features/auth/services/registrationService.js')
    registerUser = service.registerUser
  })
  beforeEach(() => {
    calls = []; failure = {}; existing = false; transactionWrites = []
    createdUser = { uid: 'new-test-user' }; auth.currentUser = null
  })
  after(async () => { await server?.close(); delete globalThis[key] })

  it('normalizes data, creates the exact document pair, and performs nothing after commit', async () => {
    assert.equal(await registerUser(input), createdUser)
    assert.deepEqual(calls, ['create', 'updateProfile', 'transaction', 'get', 'commit'])
    assert.deepEqual(transactionWrites, [
      ['users/new-test-user', {
        username: 'movie_fan', displayName: 'Movie Fan', photoURL: null, bio: '',
        onboardingCompleted: false, createdAt: 'SERVER_TIMESTAMP', updatedAt: 'SERVER_TIMESTAMP',
      }],
      ['usernames/movie_fan', { userId: 'new-test-user', createdAt: 'SERVER_TIMESTAMP' }],
    ])
  })
  it('rejects invalid input without calling Firebase', async () => {
    await assert.rejects(registerUser({ ...input, username: 'a!' }), { code: 'registration/invalid-input' })
    assert.deepEqual(calls, [])
  })
  it('never creates or deletes an existing signed-in account', async () => {
    auth.currentUser = { uid: 'existing-user' }
    await assert.rejects(registerUser(input), { code: 'registration/already-authenticated' })
    assert.deepEqual(calls, [])
  })
  it('does not delete an account when Auth creation fails', async () => {
    failure.create = codedError('auth/email-already-in-use')
    await assert.rejects(registerUser(input), { code: 'auth/email-already-in-use' })
    assert.deepEqual(calls, ['create'])
  })
  it('rolls back the created account when updateProfile fails', async () => {
    failure.update = codedError('auth/network-request-failed')
    await assert.rejects(registerUser(input), { code: 'auth/network-request-failed' })
    assert.deepEqual(calls, ['create', 'updateProfile', 'deleteUser'])
  })
  it('rolls back a taken username without scheduling document writes', async () => {
    existing = true
    await assert.rejects(registerUser(input), { code: 'username-already-taken' })
    assert.deepEqual(transactionWrites, [])
    assert.equal(calls.at(-1), 'deleteUser')
  })
  it('rolls back when the transaction rejects', async () => {
    failure.transaction = codedError('permission-denied')
    await assert.rejects(registerUser(input), { code: 'permission-denied' })
    assert.equal(calls.at(-1), 'deleteUser')
    assert.ok(!calls.includes('commit'))
  })
  it('signs out and reports rollback failure when deletion fails', async () => {
    failure.update = codedError('unknown')
    failure.delete = codedError('auth/network-request-failed')
    await assert.rejects(registerUser(input), { code: 'registration/rollback-failed' })
    assert.deepEqual(calls, ['create', 'updateProfile', 'deleteUser', 'signOut'])
    assert.equal(auth.currentUser, null)
  })
  it('reports both rollback and signout failure without hiding the remaining session', async () => {
    failure.update = codedError('unknown')
    failure.delete = codedError('unknown')
    failure.signOut = codedError('unknown')
    await assert.rejects(registerUser(input), { code: 'registration/rollback-signout-failed' })
    assert.equal(auth.currentUser, createdUser)
  })
  it('rejects concurrent registration calls', async () => {
    const first = registerUser(input)
    await assert.rejects(registerUser(input), { code: 'registration/in-progress' })
    await first
    assert.equal(calls.filter((call) => call === 'create').length, 1)
  })
})
