import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase/firestore'
import { normalizeUserProfile } from '../../src/features/profile/services/normalizeUserProfile.js'
import { getProfileErrorMessage } from '../../src/features/profile/services/profileErrors.js'
import { getProfileContextValue } from '../../src/features/profile/context/profileState.js'

const valid = {
  username: 'demo_fan', displayName: 'Demo Fan', photoURL: null, bio: '',
  onboardingCompleted: false, createdAt: new Timestamp(1, 0), updatedAt: new Timestamp(1, 0),
}
const snapshot = (data = valid) => ({ id: 'demo-user', exists: () => true, data: () => data })

describe('Profile normalization', () => {
  it('copies expected fields and uses the document ID, ignoring unknown data', () => {
    const result = normalizeUserProfile(snapshot({ ...valid, id: 'wrong', uid: 'wrong', role: 'admin' }))
    assert.deepEqual(result, { profile: { id: 'demo-user', ...valid }, profileError: null })
  })
  it('accepts a string photoURL and completed onboarding', () => {
    const data = { ...valid, photoURL: 'https://example.invalid/photo', onboardingCompleted: true }
    assert.deepEqual(normalizeUserProfile(snapshot(data)).profile, { id: 'demo-user', ...data })
  })
  it('returns a controlled missing error without reading data', () => {
    assert.deepEqual(normalizeUserProfile({ exists: () => false }), {
      profile: null, profileError: getProfileErrorMessage('missing'),
    })
  })
  for (const field of Object.keys(valid)) {
    it(`rejects missing ${field}`, () => {
      const data = { ...valid }
      delete data[field]
      assert.deepEqual(normalizeUserProfile(snapshot(data)), { profile: null, profileError: getProfileErrorMessage('invalid') })
    })
  }
  for (const [field, value] of Object.entries({ username: 1, displayName: {}, photoURL: false, bio: null, onboardingCompleted: 'true', createdAt: 1, updatedAt: 'date' })) {
    it(`rejects malformed ${field} without returning document data`, () => {
      const result = normalizeUserProfile(snapshot({ ...valid, [field]: value, private: 'RAW_DOCUMENT' }))
      assert.deepEqual(result, { profile: null, profileError: getProfileErrorMessage('invalid') })
      assert.ok(!JSON.stringify(result).includes('RAW_DOCUMENT'))
    })
  }
  it('rejects null data', () => assert.equal(normalizeUserProfile(snapshot(null)).profile, null))
  it('rejects a missing document ID', () => assert.equal(normalizeUserProfile({ ...snapshot(), id: '' }).profile, null))
})

describe('Profile context state', () => {
  const loaded = (value) => ({ uid: 'demo-user', profile: { onboardingCompleted: value }, isProfileLoading: false, profileError: null })
  it('clears all state on logout', () => {
    assert.deepEqual(getProfileContextValue(null, loaded(true)), {
      profile: null, isProfileLoading: false, profileError: null, hasCompletedOnboarding: false,
    })
  })
  it('never exposes the previous UID profile or error', () => {
    assert.deepEqual(getProfileContextValue('another-demo-user', { ...loaded(true), profileError: 'old error' }), {
      profile: null, isProfileLoading: true, profileError: null, hasCompletedOnboarding: false,
    })
  })
  for (const value of [true, false, 'true', 1, undefined]) {
    it(`requires strict boolean completion: ${String(value)}`, () => {
      assert.equal(getProfileContextValue('demo-user', loaded(value)).hasCompletedOnboarding, value === true)
    })
  }
  it('does not consider loading, failed or missing profiles complete', () => {
    for (const override of [{ isProfileLoading: true }, { profileError: 'Safe error' }, { profile: null }]) {
      assert.equal(getProfileContextValue('demo-user', { ...loaded(true), ...override }).hasCompletedOnboarding, false)
    }
  })
})
