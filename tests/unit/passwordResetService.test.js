import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { validatePasswordReset } from '../../src/features/auth/validation/passwordResetValidation.js'

const key = '__moviednaPasswordResetServiceTest'
const auth = {}
let server, requestPasswordReset, calls, failure
const stubs = {
  auth,
  async sendPasswordResetEmail(...args) {
    calls.push(args)
    if (failure) throw failure
  },
}

describe('Password reset service with mocked Firebase', { concurrency: false }, () => {
  before(async () => {
    globalThis[key] = stubs
    // No real Firebase module or .env file is loaded. No email can be sent.
    server = await createServer({
      configFile: false, envFile: false, logLevel: 'silent',
      server: { middlewareMode: true }, ssr: { noExternal: true },
      plugins: [{
        name: 'password-reset-test-firebase-boundaries', enforce: 'pre',
        resolveId(source, importer) {
          if (!importer?.endsWith('/passwordResetService.js')) return
          if (source === 'firebase/auth') return '\0mock:auth'
          if (source === '../../../shared/config/firebase.js') return '\0mock:config'
          if (source.startsWith('firebase/')) throw new Error('Password reset must only use Firebase Auth')
        },
        load(id) {
          if (id === '\0mock:auth') return `export const sendPasswordResetEmail = globalThis.${key}.sendPasswordResetEmail`
          if (id === '\0mock:config') return `export const auth = globalThis.${key}.auth`
        },
      }],
    })
    const service = await server.ssrLoadModule('/src/features/auth/services/passwordResetService.js')
    requestPasswordReset = service.requestPasswordReset
  })
  beforeEach(() => { calls = []; failure = null })
  after(async () => { await server?.close(); delete globalThis[key] })

  it('calls reset once with auth and normalized email, without ActionCodeSettings', async () => {
    const { values } = validatePasswordReset({ email: ' fan@example.invalid ' })
    const result = await requestPasswordReset(values.email)
    assert.deepEqual(calls, [[auth, 'fan@example.invalid']])
    assert.deepEqual(result, { success: true })
  })
  it('returns exactly the same result for success and user-not-found', async () => {
    const success = await requestPasswordReset('fan@example.invalid')
    failure = Object.assign(new Error('RAW_UNKNOWN_USER'), { code: 'auth/user-not-found' })
    const missing = await requestPasswordReset('missing@example.invalid')
    assert.deepEqual(missing, success)
    assert.deepEqual(missing, { success: true })
    assert.equal(JSON.stringify(missing).includes('missing@example.invalid'), false)
  })
  for (const code of ['auth/invalid-email', 'auth/too-many-requests', 'auth/network-request-failed', 'auth/operation-not-allowed']) {
    it(`returns a controlled failure for ${code}`, async () => {
      failure = Object.assign(new Error('RAW_FIREBASE_MESSAGE'), { code })
      await assert.rejects(requestPasswordReset('fan@example.invalid'), (error) => {
        assert.equal(error.code, code)
        assert.ok(!error.message.includes('RAW_FIREBASE_MESSAGE'))
        assert.ok(!error.stack.includes('RAW_FIREBASE_MESSAGE'))
        return true
      })
      assert.equal(calls.length, 1)
    })
  }
  it('does not turn unknown errors into success or leak raw messages', async () => {
    failure = new Error('RAW_UNKNOWN_MESSAGE')
    await assert.rejects(requestPasswordReset('fan@example.invalid'), {
      code: 'password-reset/unknown', message: "We couldn't process your request. Please try again later.",
    })
  })
})
