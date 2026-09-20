import { it } from 'node:test'
import assert from 'node:assert/strict'
import { LoginError, getLoginErrorMessage } from '../../src/features/auth/services/loginErrors.js'

it('uses the same neutral message for invalid credentials, missing user, and wrong password', () => {
  for (const code of ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password']) {
    assert.equal(getLoginErrorMessage({ code }), 'Incorrect email or password.')
  }
})
for (const code of [
  'auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email',
  'auth/user-disabled', 'auth/too-many-requests', 'auth/network-request-failed', 'auth/operation-not-allowed',
]) {
  it(`safely handles ${code}`, () => {
    const error = new LoginError(code)
    assert.equal(error.code, code)
    const message = getLoginErrorMessage({ code, message: 'RAW_FIREBASE_MESSAGE', stack: 'RAW_STACK' })
    assert.equal(message, error.message)
    assert.ok(message.length > 0)
    assert.ok(!message.includes(code))
    assert.ok(!message.includes('RAW_FIREBASE_MESSAGE'))
    assert.ok(!message.includes('RAW_STACK'))
  })
}
it('uses a neutral fallback for unknown or absent errors', () => {
  const fallback = "We couldn't sign you in. Please try again later."
  for (const error of [null, undefined, { code: 'unexpected', message: 'RAW_DETAILS' }, { code: 'toString' }]) {
    assert.equal(getLoginErrorMessage(error), fallback)
  }
  assert.equal(new LoginError('unexpected').code, 'login/unknown')
})
