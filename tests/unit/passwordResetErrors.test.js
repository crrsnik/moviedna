import { it } from 'node:test'
import assert from 'node:assert/strict'
import { PasswordResetError, getPasswordResetErrorMessage, PASSWORD_RESET_SUCCESS_MESSAGE } from '../../src/features/auth/services/passwordResetErrors.js'

it('uses an account-neutral success message without an email', () => {
  assert.equal(PASSWORD_RESET_SUCCESS_MESSAGE, 'If an account exists for this email, password reset instructions have been sent.')
  assert.ok(!PASSWORD_RESET_SUCCESS_MESSAGE.includes('@'))
})
for (const code of ['auth/invalid-email', 'auth/too-many-requests', 'auth/network-request-failed', 'auth/operation-not-allowed']) {
  it(`safely maps reset error ${code}`, () => {
    const error = new PasswordResetError(code)
    const message = getPasswordResetErrorMessage({ code, message: 'RAW_FIREBASE_MESSAGE', stack: 'RAW_STACK' })
    assert.equal(error.code, code)
    assert.equal(message, error.message)
    assert.ok(message.length > 0)
    for (const raw of [code, 'RAW_FIREBASE_MESSAGE', 'RAW_STACK']) assert.ok(!message.includes(raw))
  })
}
it('safely handles unknown or absent reset errors', () => {
  const message = "We couldn't process your request. Please try again later."
  for (const error of [undefined, null, { code: 'unexpected', message: 'RAW_DETAILS' }, { code: 'toString' }]) {
    assert.equal(getPasswordResetErrorMessage(error), message)
  }
  assert.equal(new PasswordResetError('unexpected').code, 'password-reset/unknown')
})
