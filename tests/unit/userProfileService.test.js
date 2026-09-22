import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { Timestamp } from 'firebase/firestore'
import { getProfileErrorMessage } from '../../src/features/profile/services/profileErrors.js'

const key = '__moviednaProfileServiceTest'
const db = {}
let server, subscribe, calls, next, fail, setupError, stopped
const unsubscribe = () => { stopped++ }
const stubs = {
  db, Timestamp,
  doc(...args) { calls.push(args); return 'mock-document' },
  onSnapshot(reference, options, onNext, onError) {
    assert.deepEqual(options, { includeMetadataChanges: true })
    assert.equal(reference, 'mock-document')
    if (setupError) throw setupError
    next = onNext; fail = onError
    return unsubscribe
  },
}

describe('Profile subscription with mocked Firebase', { concurrency: false }, () => {
  before(async () => {
    globalThis[key] = stubs
    server = await createServer({
      configFile: false, envFile: false, logLevel: 'silent',
      server: { middlewareMode: true }, ssr: { noExternal: true },
      plugins: [{
        name: 'profile-test-firebase-boundaries', enforce: 'pre',
        resolveId(source, importer) {
          if (!importer?.includes('/features/profile/services/')) return
          if (source === 'firebase/firestore') return '\0mock:firestore'
          if (source === '../../../shared/config/firebase.js') return '\0mock:config'
          if (source.startsWith('firebase/')) throw new Error('Profile service must only use Firestore')
        },
        load(id) {
          // No queries or writes are exported; app config and env are never loaded.
          if (id === '\0mock:firestore') return `export const { doc, onSnapshot, Timestamp } = globalThis.${key}`
          if (id === '\0mock:config') return `export const db = globalThis.${key}.db`
        },
      }],
    })
    subscribe = (await server.ssrLoadModule('/src/features/profile/services/userProfileService.js')).subscribeToUserProfile
  })
  beforeEach(() => { calls = []; next = null; fail = null; setupError = null; stopped = 0 })
  after(async () => { await server?.close(); delete globalThis[key] })

  it('subscribes only to users/uid and returns the actual unsubscribe function', () => {
    const cleanup = subscribe('demo-user', () => {})
    assert.deepEqual(calls, [[db, 'users', 'demo-user']])
    assert.equal(cleanup, unsubscribe)
    cleanup()
    assert.equal(stopped, 1)
  })
  it('delivers valid snapshots and recovers after a missing profile', () => {
    const results = []
    subscribe('demo-user', (value) => results.push(value))
    next({ exists: () => false })
    const data = { username: 'demo_fan', displayName: 'Demo', bio: '', photoURL: null, onboardingCompleted: false, createdAt: new Timestamp(1, 0), updatedAt: new Timestamp(1, 0) }
    next({ id: 'demo-user', exists: () => true, data: () => ({ ...data, role: 'ignored' }) })
    assert.deepEqual(results[1], { profile: { id: 'demo-user', ...data }, profileError: null })
  })
  it('ignores pending writes and publishes the confirmed metadata event', () => {
    const results = []
    subscribe('demo-user', (value) => results.push(value))
    const data = { username: 'demo_fan', displayName: 'Demo', bio: '', photoURL: null, onboardingCompleted: true, createdAt: new Timestamp(1, 0), updatedAt: new Timestamp(2, 0) }
    const snapshot = { id: 'demo-user', exists: () => true, data: () => data }
    next({ ...snapshot, metadata: { hasPendingWrites: true } })
    assert.equal(results.length, 0)
    next({ ...snapshot, metadata: { hasPendingWrites: false } })
    assert.equal(results.length, 1)
    assert.equal(results[0].profile.onboardingCompleted, true)
  })
  it('reports a missing document and remains subscribed for later snapshots', () => {
    const results = []
    subscribe('demo-user', (value) => results.push(value))
    next({ exists: () => false })
    next({ exists: () => false })
    assert.equal(results.length, 2)
    assert.deepEqual(results[0], { profile: null, profileError: getProfileErrorMessage('missing') })
    assert.equal(stopped, 0)
  })
  it('handles malformed snapshot exceptions without raw data', () => {
    let result
    subscribe('demo-user', (value) => { result = value })
    next({ exists: () => true, data: () => { throw new Error('RAW_DOCUMENT') } })
    assert.deepEqual(result, { profile: null, profileError: getProfileErrorMessage('invalid') })
  })
  for (const code of ['permission-denied', 'unavailable', 'unknown', 'unexpected-code', 'toString']) {
    it(`sanitizes ${code} and clears a previously received profile`, () => {
      let result = { profile: {} }
      subscribe('demo-user', (value) => { result = value })
      fail({ code, message: 'RAW_FIREBASE_MESSAGE', private: 'PRIVATE_DATA' })
      assert.deepEqual(result, { profile: null, profileError: getProfileErrorMessage(code) })
      assert.ok(!JSON.stringify(result).includes('RAW_FIREBASE_MESSAGE'))
    })
  }
  it('handles synchronous setup failures and returns a callable cleanup', () => {
    setupError = { code: 'unavailable', message: 'RAW_SETUP_MESSAGE' }
    let result
    const cleanup = subscribe('demo-user', (value) => { result = value })
    cleanup()
    assert.deepEqual(result, { profile: null, profileError: getProfileErrorMessage('unavailable') })
  })
  for (const uid of [null, '', 'user/path']) {
    it(`refuses invalid ID ${JSON.stringify(uid)} without any Firestore call`, () => {
      let result
      subscribe(uid, (value) => { result = value })()
      assert.deepEqual(calls, [])
      assert.deepEqual(result, { profile: null, profileError: getProfileErrorMessage('unknown') })
    })
  }
})
