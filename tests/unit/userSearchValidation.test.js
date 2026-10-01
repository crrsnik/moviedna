import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createUserSearchParams,
  getUserSearchError,
  normalizeUserSearchQuery,
} from '../../src/features/profile/validation/userSearchValidation.js'

describe('user search validation', () => {
  it('normalizes optional @ prefix and casing', () => {
    assert.equal(
      normalizeUserSearchQuery('  @Svit_Lana  '),
      'svit_lana',
    )
  })

  it('accepts canonical usernames', () => {
    assert.equal(getUserSearchError('alice_123'), null)
    assert.equal(getUserSearchError('@alice_123'), null)
  })

  it('rejects malformed usernames', () => {
    assert.ok(getUserSearchError('ab'))
    assert.ok(getUserSearchError('alice-bob'))
    assert.ok(getUserSearchError('alice bob'))
    assert.ok(getUserSearchError('@'))
    assert.ok(getUserSearchError('a'.repeat(21)))
  })

  it('creates a canonical shareable search query', () => {
    const params = createUserSearchParams('@Alice_123')

    assert.equal(
      params.toString(),
      'q=alice_123',
    )
  })
})
