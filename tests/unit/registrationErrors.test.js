import { it } from 'node:test'
import assert from 'node:assert/strict'
import { RegistrationError, getRegistrationErrorMessage } from '../../src/features/auth/services/registrationErrors.js'

for (const code of [
  'username-already-taken', 'auth/email-already-in-use', 'auth/invalid-email',
  'auth/weak-password', 'auth/network-request-failed', 'auth/operation-not-allowed',
  'permission-denied', 'registration/rollback-failed', 'registration/rollback-signout-failed',
]) {
  it(`maps ${code} to a safe user message`, () => {
    const error = new RegistrationError(code)
    assert.equal(error.code, code)
    const message = getRegistrationErrorMessage({ code, message: 'RAW_FIREBASE_DETAILS' })
    assert.equal(message, error.message)
    assert.ok(message.length > 0)
    assert.ok(!message.includes(code))
    assert.ok(!message.includes('RAW_FIREBASE_DETAILS'))
  })
}
it('maps unknown and missing errors without exposing raw messages', () => {
  const expected = getRegistrationErrorMessage(null)
  assert.equal(getRegistrationErrorMessage({ code: 'unexpected', message: 'private' }), expected)
  assert.equal(getRegistrationErrorMessage({ code: 'toString' }), expected)
  assert.equal(new RegistrationError('unexpected').code, 'registration/unknown')
})
