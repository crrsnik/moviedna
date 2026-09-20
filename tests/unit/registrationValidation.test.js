import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUsername, validateRegistration } from '../../src/features/auth/validation/registrationValidation.js'

const valid = {
  username: 'movie_fan', displayName: 'Movie Fan', email: 'fan@example.invalid',
  password: 'abcdefgh', confirmPassword: 'abcdefgh',
}

describe('Registration validation', () => {
  it('accepts valid data without mutating the input', () => {
    const input = Object.freeze({ ...valid })
    assert.deepEqual(validateRegistration(input), {})
  })
  it('trims and lowercases username', () => {
    assert.equal(normalizeUsername('  Movie_Fan  '), 'movie_fan')
  })
  it('accepts uppercase username after normalization', () => {
    assert.deepEqual(validateRegistration({ ...valid, username: '  MOVIE_FAN  ' }), {})
  })
  it('preserves forbidden characters instead of silently removing them', () => {
    assert.equal(normalizeUsername(' A B-C! '), 'a b-c!')
  })
  for (const username of ['ab', 'a'.repeat(21), 'a b', 'a-b', 'a@b', 'a.b', '', 'кино']) {
    it(`rejects username ${JSON.stringify(username)}`, () => {
      assert.deepEqual(Object.keys(validateRegistration({ ...valid, username })), ['username'])
    })
  }
  for (const username of ['a_1', 'a'.repeat(20)]) {
    it(`accepts username length ${username.length}`, () => {
      assert.deepEqual(validateRegistration({ ...valid, username }), {})
    })
  }
  for (const displayName of ['', '   ', 'a'.repeat(51)]) {
    it(`rejects displayName ${JSON.stringify(displayName)}`, () => {
      assert.deepEqual(Object.keys(validateRegistration({ ...valid, displayName })), ['displayName'])
    })
  }
  for (const displayName of [' A ', ` ${'a'.repeat(50)} `]) {
    it(`accepts trimmed displayName length ${displayName.trim().length}`, () => {
      assert.deepEqual(validateRegistration({ ...valid, displayName }), {})
    })
  }
  for (const email of ['', '   ', 'not-an-email', 'a@b', 'a b@example.invalid', 'a@@example.invalid']) {
    it(`rejects email ${JSON.stringify(email)}`, () => {
      assert.deepEqual(Object.keys(validateRegistration({ ...valid, email })), ['email'])
    })
  }
  it('accepts email with surrounding whitespace', () => {
    assert.deepEqual(validateRegistration({ ...valid, email: ' fan@example.invalid ' }), {})
  })
  for (const length of [7, 129]) {
    it(`rejects password length ${length}`, () => {
      const password = 'a'.repeat(length)
      assert.deepEqual(Object.keys(validateRegistration({ ...valid, password, confirmPassword: password })), ['password'])
    })
  }
  for (const length of [8, 128]) {
    it(`accepts password length ${length} without complexity requirements`, () => {
      const password = 'a'.repeat(length)
      assert.deepEqual(validateRegistration({ ...valid, password, confirmPassword: password }), {})
    })
  }
  it('requires matching passwords', () => {
    assert.deepEqual(Object.keys(validateRegistration({ ...valid, confirmPassword: 'different' })), ['confirmPassword'])
  })
  it('requires password confirmation', () => {
    assert.deepEqual(Object.keys(validateRegistration({ ...valid, confirmPassword: '' })), ['confirmPassword'])
  })
  it('does not trim or normalize passwords', () => {
    const password = '  secret  '
    assert.deepEqual(validateRegistration({ ...valid, password, confirmPassword: password }), {})
    assert.ok(validateRegistration({ ...valid, password, confirmPassword: password.trim() }).confirmPassword)
  })
  it('returns all simultaneous field errors', () => {
    assert.deepEqual(Object.keys(validateRegistration({ username: 'a', displayName: '', email: '', password: '123', confirmPassword: '' })),
      ['username', 'displayName', 'email', 'password', 'confirmPassword'])
  })
  it('handles missing values without throwing', () => {
    assert.equal(normalizeUsername(undefined), '')
    assert.equal(Object.keys(validateRegistration({})).length, 5)
  })
})
