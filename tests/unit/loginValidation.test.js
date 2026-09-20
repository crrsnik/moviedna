import { it } from 'node:test'
import assert from 'node:assert/strict'
import { validateLogin } from '../../src/features/auth/validation/loginValidation.js'

it('trims email and returns normalized values without mutating inputs', () => {
  const input = Object.freeze({ email: '  Fan@Example.invalid  ', password: ' secret ' })
  assert.deepEqual(validateLogin(input), {
    values: { email: 'Fan@Example.invalid', password: ' secret ' }, errors: {},
  })
})
for (const email of ['', '   ', 'invalid', 'a@b', 'a b@example.invalid', 'a@@example.invalid', undefined, null]) {
  it(`rejects missing or invalid email: ${JSON.stringify(email)}`, () => {
    assert.deepEqual(Object.keys(validateLogin({ email, password: 'test' }).errors), ['email'])
  })
}
for (const password of ['', undefined, null]) {
  it(`requires password: ${JSON.stringify(password)}`, () => {
    assert.deepEqual(Object.keys(validateLogin({ email: 'fan@example.invalid', password }).errors), ['password'])
  })
}
for (const password of ['x', '123456', '   ', 'x'.repeat(129)]) {
  it(`does not apply registration password constraints (length ${password.length})`, () => {
    const result = validateLogin({ email: 'fan@example.invalid', password })
    assert.deepEqual(result.errors, {})
    assert.equal(result.values.password, password)
  })
}
it('reports both missing fields', () => {
  assert.deepEqual(Object.keys(validateLogin({}).errors), ['email', 'password'])
})
