import { it } from 'node:test'
import assert from 'node:assert/strict'
import { validatePasswordReset } from '../../src/features/auth/validation/passwordResetValidation.js'

it('trims a valid reset email without mutating input', () => {
  const input = Object.freeze({ email: '  Fan@Example.invalid  ' })
  assert.deepEqual(validatePasswordReset(input), { values: { email: 'Fan@Example.invalid' }, errors: {} })
})
for (const email of ['', '   ', undefined, null, 'invalid', 'a@b', 'a b@example.invalid', 'a@@example.invalid']) {
  it(`rejects missing or invalid reset email: ${JSON.stringify(email)}`, () => {
    assert.deepEqual(validatePasswordReset({ email }).errors, { email: 'Enter a valid email address.' })
  })
}
