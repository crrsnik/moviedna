import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { validateLogin } from '../../src/features/auth/validation/loginValidation.js'

const key = '__moviednaLoginServiceTest'
const auth = {}
const user = { uid: 'mock-login-user' }
let server, loginUser, calls, failure
const stubs = {
  auth,
  async signInWithEmailAndPassword(...args) {
    calls.push(args)
    if (failure) throw failure
    return { user }
  },
}

describe('Login service with mocked Firebase', { concurrency: false }, () => {
  before(async () => {
    globalThis[key] = stubs
    // The real Firebase config and SDK are replaced before service evaluation.
    server = await createServer({
      configFile: false, envFile: false, logLevel: 'silent',
      server: { middlewareMode: true }, ssr: { noExternal: true },
      plugins: [{
        name: 'login-test-firebase-boundaries', enforce: 'pre',
        resolveId(source, importer) {
          if (!importer?.endsWith('/loginService.js')) return
          if (source === 'firebase/auth') return '\0mock:auth'
          if (source === '../../../shared/config/firebase.js') return '\0mock:config'
          if (source.startsWith('firebase/')) throw new Error('Login must only use Firebase Auth')
        },
        load(id) {
          if (id === '\0mock:auth') return `export const signInWithEmailAndPassword = globalThis.${key}.signInWithEmailAndPassword`
          if (id === '\0mock:config') return `export const auth = globalThis.${key}.auth`
        },
      }],
    })
    const service = await server.ssrLoadModule('/src/features/auth/services/loginService.js')
    loginUser = service.loginUser
  })
  beforeEach(() => { calls = []; failure = null })
  after(async () => { await server?.close(); delete globalThis[key] })

  it('calls sign-in once with auth, normalized email, and unchanged password', async () => {
    const { values } = validateLogin({ email: ' fan@example.invalid ', password: ' p ' })
    await loginUser(values)
    assert.deepEqual(calls, [[auth, 'fan@example.invalid', ' p ']])
  })
  it('returns exactly the authenticated user', async () => {
    assert.equal(await loginUser({ email: 'fan@example.invalid', password: '123456' }), user)
    assert.equal(calls.length, 1)
  })
  it('returns a controlled error without raw Firebase details on rejection', async () => {
    failure = Object.assign(new Error('RAW_FIREBASE_MESSAGE'), { code: 'auth/wrong-password' })
    await assert.rejects(loginUser({ email: 'fan@example.invalid', password: 'test' }), (error) => {
      assert.equal(error.code, 'auth/wrong-password')
      assert.equal(error.message, 'Incorrect email or password.')
      assert.ok(!error.stack.includes('RAW_FIREBASE_MESSAGE'))
      return true
    })
    assert.equal(calls.length, 1)
  })
  it('sanitizes unknown failures', async () => {
    failure = new Error('RAW_UNKNOWN_MESSAGE')
    await assert.rejects(loginUser({ email: 'fan@example.invalid', password: 'test' }), {
      code: 'login/unknown', message: "We couldn't sign you in. Please try again later.",
    })
  })
})
