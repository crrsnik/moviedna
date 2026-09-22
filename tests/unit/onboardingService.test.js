import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { Timestamp } from 'firebase/firestore'

const key = '__moviednaOnboardingServiceTest'
const db = {}, auth = { currentUser: { uid: 'demo-user' } }
const serverTime = Object.freeze({ syntheticServerTimestamp: true })
const movie = { id: 123, mediaType: 'movie', title: 'Synthetic', overview: 'Synthetic', posterPath: '/demo.jpg', voteAverage: 7, genreIds: [18, 18, 35] }
const data = (id = 123, overrides = {}) => ({ tmdbId: id, mediaType: 'movie', reaction: 'like', genreIds: [18], createdAt: new Timestamp(1, 0), updatedAt: new Timestamp(2, 0), ...overrides })
const document = (value, id = String(value?.tmdbId)) => ({ id, exists: () => value !== null, data: () => value })
let server, service, saved, docs, completed, summaryExists, calls, writes, failure, batchCount, commitCount, afterRead, commitWait
const stubs = {
  db, auth, Timestamp,
  doc(database, ...segments) { assert.equal(database, db); return segments.join('/') },
  collection(database, ...segments) { assert.equal(database, db); return segments.join('/') },
  serverTimestamp() { return serverTime },
  async getDocsFromServer(path) {
    calls.push(['list', path])
    if (failure) throw failure
    afterRead?.()
    return { docs }
  },
  async getDocFromServer(path) {
    calls.push(['get', path])
    if (failure) throw failure
    return path.endsWith('/summary') ? document(summaryExists ? {} : null) : document({ onboardingCompleted: completed })
  },
  async runTransaction(database, callback) {
    assert.equal(database, db)
    calls.push(['transaction'])
    if (failure) throw failure
    await callback({
      async get(path) {
        calls.push(['transaction-get', path])
        return path.includes('/onboardingResponses/') ? document(saved) : document({ onboardingCompleted: completed })
      },
      set(path, value) { writes.push(['set', path, value]) },
      update(path, value) { writes.push(['update', path, value]) },
    })
    if (commitWait) await commitWait
  },
  writeBatch(database) {
    assert.equal(database, db); batchCount++
    return {
      set(...args) { writes.push(['set', ...args]) },
      update(...args) { writes.push(['update', ...args]) },
      async commit() { commitCount++; if (commitWait) await commitWait },
    }
  },
}

describe('Onboarding service with Firebase boundaries mocked', { concurrency: false }, () => {
  before(async () => {
    globalThis[key] = stubs
    server = await createServer({
      configFile: false, envFile: false, logLevel: 'silent', server: { middlewareMode: true }, ssr: { noExternal: true },
      plugins: [{
        name: 'onboarding-test-firebase-boundary', enforce: 'pre',
        resolveId(source, importer) {
          if (!importer?.endsWith('/onboardingService.js')) return
          if (source === 'firebase/firestore') return '\0mock:firestore'
          if (source === '../../../shared/config/firebase.js') return '\0mock:config'
          if (source.startsWith('firebase/')) throw new Error('Unexpected Firebase import')
        },
        load(id) {
          if (id === '\0mock:firestore') return `export const { doc, collection, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp, Timestamp, writeBatch } = globalThis.${key}`
          if (id === '\0mock:config') return `export const { auth, db } = globalThis.${key}`
        },
      }],
    })
    service = await server.ssrLoadModule('/src/features/onboarding/services/onboardingService.js')
  })
  beforeEach(() => {
    auth.currentUser = { uid: 'demo-user' }
    saved = null; completed = false; summaryExists = false; calls = []; writes = []; failure = null
    batchCount = 0; commitCount = 0; afterRead = null; commitWait = null
    docs = Array.from({ length: 10 }, (_, i) => document(data(i + 1, { reaction: i < 3 ? 'like' : i < 5 ? 'dislike' : 'skip' })))
  })
  after(async () => { await server?.close(); delete globalThis[key] })

  it('loads only the own response collection from the server and normalizes documents', async () => {
    const result = await service.loadOnboardingResponses({ uid: 'demo-user' })
    assert.deepEqual(calls, [['list', 'users/demo-user/onboardingResponses']])
    assert.equal(result.length, 10)
    assert.deepEqual(result[0], { id: '1', ...data(1) })
  })
  it('creates an exact response with server timestamps in a transaction', async () => {
    const result = await service.saveOnboardingResponse({ uid: 'demo-user', movie, reaction: 'skip' })
    assert.deepEqual(writes, [['set', 'users/demo-user/onboardingResponses/123', {
      tmdbId: 123, mediaType: 'movie', reaction: 'skip', genreIds: [18, 35], createdAt: serverTime, updatedAt: serverTime,
    }]])
    assert.deepEqual(result, { id: '123', tmdbId: 123, mediaType: 'movie', reaction: 'skip', genreIds: [18, 35] })
    assert.deepEqual(calls.map((c) => c[0]), ['transaction', 'transaction-get', 'transaction-get'])
    assert.ok(!JSON.stringify(writes).includes('Synthetic'))
  })
  it('updates only mutable fields and keeps createdAt/tmdbId/mediaType', async () => {
    saved = data()
    await service.saveOnboardingResponse({ uid: 'demo-user', movie, reaction: 'dislike' })
    assert.deepEqual(writes, [['update', 'users/demo-user/onboardingResponses/123', { reaction: 'dislike', genreIds: [18, 35], updatedAt: serverTime }]])
  })
  it('does not report save success before transaction confirmation', async () => {
    let release, resolved = false
    commitWait = new Promise((resolve) => { release = resolve })
    const task = service.saveOnboardingResponse({ uid: 'demo-user', movie, reaction: 'like' }).then(() => { resolved = true })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(resolved, false)
    release(); await task
    assert.equal(resolved, true)
  })
  it('validates input before any Firestore operation', async () => {
    await assert.rejects(service.saveOnboardingResponse({ uid: 'demo-user', movie: { ...movie, id: '123' }, reaction: 'like' }), { code: 'invalid-input' })
    await assert.rejects(service.saveOnboardingResponse({ uid: '', movie, reaction: 'like' }), { code: 'invalid-input' })
    assert.deepEqual(calls, [])
  })
  it('refuses another UID or a logged-out session before reads/writes', async () => {
    await assert.rejects(service.loadOnboardingResponses({ uid: 'another-demo-user' }), { code: 'unauthenticated' })
    auth.currentUser = null
    await assert.rejects(service.completeOnboarding({ uid: 'demo-user' }), { code: 'unauthenticated' })
    assert.deepEqual(calls, [])
  })
  it('rejects results when the session changes during the read', async () => {
    afterRead = () => { auth.currentUser = null }
    await assert.rejects(service.loadOnboardingResponses({ uid: 'demo-user' }), { code: 'unauthenticated' })
  })
  for (const [name, snapshot] of [
    ['ID mismatch', document(data(1), '2')], ['leading zero', document(data(1), '01')],
    ['invalid reaction', document(data(1, { reaction: 'love' }))],
    ['non-integer genre', document(data(1, { genreIds: ['18'] }))],
    ['bad timestamp', document(data(1, { createdAt: null }))],
    ['extra TMDB content', document(data(1, { title: 'Synthetic' }))],
    ['missing field', document({ tmdbId: 1, mediaType: 'movie' }, '1')],
  ]) {
    it(`rejects corrupt saved data: ${name}`, async () => {
      docs = [snapshot]
      await assert.rejects(service.loadOnboardingResponses({ uid: 'demo-user' }), { code: 'invalid-data' })
      await assert.rejects(service.completeOnboarding({ uid: 'demo-user' }), { code: 'invalid-data' })
      assert.equal(batchCount, 0)
    })
  }
  it('refuses updating a corrupted existing response', async () => {
    saved = data(123, { mediaType: 'tv' })
    await assert.rejects(service.saveOnboardingResponse({ uid: 'demo-user', movie, reaction: 'like' }), { code: 'invalid-data' })
    assert.deepEqual(writes, [])
  })
  it('rereads Firestore responses and computes exact completion payloads in one batch', async () => {
    await service.loadOnboardingResponses({ uid: 'demo-user' })
    docs.push(document(data(11)))
    const counts = await service.completeOnboarding({ uid: 'demo-user', counts: { responseCount: 999 } })
    assert.equal(calls.filter(([operation]) => operation === 'list').length, 2)
    assert.deepEqual(counts, { responseCount: 11, likedCount: 4, dislikedCount: 2, skippedCount: 5 })
    assert.deepEqual(writes, [
      ['set', 'users/demo-user/onboarding/summary', { version: 1, userId: 'demo-user', status: 'completed', ...counts, completedAt: serverTime, updatedAt: serverTime }],
      ['update', 'users/demo-user', { onboardingCompleted: true, updatedAt: serverTime }],
    ])
    assert.equal(batchCount, 1); assert.equal(commitCount, 1)
  })
  it('waits for batch commit confirmation', async () => {
    let release, resolved = false
    commitWait = new Promise((resolve) => { release = resolve })
    const task = service.completeOnboarding({ uid: 'demo-user' }).then(() => { resolved = true })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(resolved, false)
    release(); await task
    assert.equal(resolved, true)
  })
  it('reports a rejected batch safely without returning success', async () => {
    commitWait = new Promise((resolve, reject) => setTimeout(() => reject({ code: 'permission-denied', message: 'RAW_BATCH_DETAILS' }), 20))
    await assert.rejects(service.completeOnboarding({ uid: 'demo-user' }), (error) => error.code === 'permission-denied' && !error.message.includes('RAW_BATCH_DETAILS'))
    assert.equal(commitCount, 1)
  })
  for (const n of [9, 31]) {
    it(`does not create a batch for ${n} responses`, async () => {
      docs = Array.from({ length: n }, (_, i) => document(data(i + 1)))
      await assert.rejects(service.completeOnboarding({ uid: 'demo-user' }), { code: 'insufficient-responses' })
      assert.equal(batchCount, 0)
    })
  }
  it('does not create a batch for fewer than five opinions', async () => {
    docs = Array.from({ length: 10 }, (_, i) => document(data(i + 1, { reaction: i < 4 ? 'like' : 'skip' })))
    await assert.rejects(service.completeOnboarding({ uid: 'demo-user' }), { code: 'insufficient-opinions' })
    assert.equal(batchCount, 0)
  })
  it('reports already completed for profile completion and existing summary', async () => {
    completed = true
    await assert.rejects(service.completeOnboarding({ uid: 'demo-user' }), { code: 'already-completed' })
    await assert.rejects(service.saveOnboardingResponse({ uid: 'demo-user', movie, reaction: 'like' }), { code: 'already-completed' })
    completed = false; summaryExists = true
    await assert.rejects(service.completeOnboarding({ uid: 'demo-user' }), { code: 'already-completed' })
    assert.equal(batchCount, 0)
    assert.deepEqual(writes, [])
  })
  for (const code of ['permission-denied', 'unauthenticated', 'unavailable', 'deadline-exceeded', 'aborted', 'failed-precondition', 'unknown']) {
    it(`maps ${code} safely on reads, transactions and completion`, async () => {
      failure = Object.assign(new Error('RAW_PRIVATE_FIRESTORE'), { code })
      for (const operation of [() => service.loadOnboardingResponses({ uid: 'demo-user' }), () => service.saveOnboardingResponse({ uid: 'demo-user', movie, reaction: 'like' }), () => service.completeOnboarding({ uid: 'demo-user' })]) {
        await assert.rejects(operation(), (error) => error.code === code && !error.message.includes('RAW_PRIVATE') && !error.stack.includes('RAW_PRIVATE'))
      }
    })
  }
})
