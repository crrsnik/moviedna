import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getOnboardingCounts, normalizeResponse, validateCompletionCounts, validateUid } from '../../src/features/onboarding/validation/onboardingValidation.js'
import { getOnboardingErrorMessage, toOnboardingError } from '../../src/features/onboarding/services/onboardingErrors.js'

const input = (overrides = {}) => ({ tmdbId: 123, mediaType: 'movie', reaction: 'like', genreIds: [18], ...overrides })
const responses = (n, opinions = n) => Array.from({ length: n }, (_, i) => input({ tmdbId: i + 1, reaction: i < opinions ? (i % 2 ? 'dislike' : 'like') : 'skip' }))

describe('Onboarding validation', () => {
  for (const reaction of ['like', 'dislike', 'skip']) {
    it(`accepts ${reaction}`, () => assert.equal(normalizeResponse(input({ reaction })).reaction, reaction))
  }
  for (const tmdbId of [0, -1, 1.5, '123', null, NaN, Number.MAX_SAFE_INTEGER + 1, 1000000000000]) {
    it(`rejects invalid movie ID ${String(tmdbId)}`, () => assert.throws(() => normalizeResponse(input({ tmdbId })), { code: 'invalid-input' }))
  }
  for (const tmdbId of [1, 999999999999]) {
    it(`accepts ID boundary ${tmdbId}`, () => assert.equal(normalizeResponse(input({ tmdbId })).tmdbId, tmdbId))
  }
  for (const overrides of [{ reaction: 'love' }, { reaction: null }, { mediaType: 'tv' }, { genreIds: null }, { genreIds: '18' }, { genreIds: [1.5] }, { genreIds: [0] }, { genreIds: [-1] }, { genreIds: ['18'] }, { genreIds: [Number.MAX_SAFE_INTEGER + 1] }, { genreIds: Array(11).fill(1) }]) {
    it(`rejects malformed input ${JSON.stringify(overrides)}`, () => assert.throws(() => normalizeResponse(input(overrides)), { code: 'invalid-input' }))
  }
  it('normalizes duplicates without mutating input or carrying TMDB metadata', () => {
    const original = Object.freeze(input({ genreIds: Object.freeze([18, 35, 18]), title: 'Synthetic', posterPath: '/synthetic.jpg', overview: 'Synthetic', rating: 7 }))
    assert.deepEqual(normalizeResponse(original), input({ genreIds: [18, 35] }))
    assert.deepEqual(original.genreIds, [18, 35, 18])
  })
  it('accepts empty and ten-element genres', () => {
    assert.deepEqual(normalizeResponse(input({ genreIds: [] })).genreIds, [])
    assert.equal(normalizeResponse(input({ genreIds: Array.from({ length: 10 }, (_, i) => i + 1) })).genreIds.length, 10)
  })
  for (const uid of [null, undefined, '', ' ', ' user ', 'users/a', '.', '..', 1]) {
    it(`rejects invalid uid ${String(uid)}`, () => assert.throws(() => validateUid(uid), { code: 'invalid-input' }))
  }
  it('accepts a single UID segment unchanged', () => assert.equal(validateUid('demo-user'), 'demo-user'))
  it('calculates counts from reactions', () => assert.deepEqual(getOnboardingCounts(responses(10, 5)), { responseCount: 10, likedCount: 3, dislikedCount: 2, skippedCount: 5 }))
  for (const n of [0, 9, 31]) {
    it(`rejects completion with ${n} responses`, () => assert.throws(() => validateCompletionCounts(getOnboardingCounts(responses(n))), { code: 'insufficient-responses' }))
  }
  for (const n of [10, 30]) {
    it(`allows completion with ${n} responses and 5 opinions`, () => assert.equal(validateCompletionCounts(getOnboardingCounts(responses(n, 5))).responseCount, n))
  }
  it('rejects four opinions among ten responses', () => assert.throws(() => validateCompletionCounts(getOnboardingCounts(responses(10, 4))), { code: 'insufficient-opinions' }))
  it('rejects duplicate response documents', () => assert.throws(() => getOnboardingCounts([input(), input()]), { code: 'invalid-data' }))
  it('rejects corrupt response lists', () => {
    assert.throws(() => getOnboardingCounts(null), { code: 'invalid-data' })
    assert.throws(() => getOnboardingCounts([null]), { code: 'invalid-data' })
  })
  for (const patch of [{ responseCount: 11 }, { likedCount: 0.5 }, { skippedCount: -1 }, { responseCount: '10' }]) {
    it(`rejects count inconsistency ${JSON.stringify(patch)}`, () => assert.throws(() => validateCompletionCounts({ ...getOnboardingCounts(responses(10, 5)), ...patch }), { code: 'invalid-data' }))
  }
})

describe('Safe onboarding errors', () => {
  for (const code of ['permission-denied', 'unauthenticated', 'unavailable', 'deadline-exceeded', 'aborted', 'failed-precondition', 'invalid-input', 'invalid-data', 'insufficient-responses', 'insufficient-opinions', 'already-completed', 'unexpected']) {
    it(`maps ${code} without raw data`, () => {
      const error = toOnboardingError({ code, message: 'RAW_PRIVATE_DATA' })
      assert.ok(!error.message.includes('RAW_PRIVATE_DATA'))
      assert.ok(!error.stack.includes('RAW_PRIVATE_DATA'))
      assert.equal(getOnboardingErrorMessage(error), error.message)
      assert.notEqual(error.message, code)
    })
  }
  it('handles network-like Auth errors safely', () => assert.equal(toOnboardingError({ code: 'auth/network-request-failed' }).code, 'unavailable'))
})
