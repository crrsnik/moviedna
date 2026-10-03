import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canReachMinimum, getDeckState, getKeyboardReaction, getOnboardingProgress, getSwipeReaction, prepareOnboardingDeck, SWIPE_THRESHOLD } from '../../src/features/onboarding/utils/onboardingDeck.js'

const movie = (id, overrides = {}) => ({ id, mediaType: 'movie', title: 'Synthetic movie', genreIds: [], posterPath: null, ...overrides })
const response = (id, reaction = 'like') => ({ tmdbId: id, mediaType: 'movie', reaction, genreIds: [] })

describe('Onboarding deck and progress', () => {
  it('deduplicates, filters malformed media and excludes saved responses', () => {
    const original = [null, {}, movie(-1), movie(1), movie(2), movie(2), movie(3, { title: ' ' }), movie(4, { mediaType: 'tv' }), movie('5'), movie(6)]
    assert.deepEqual(
      prepareOnboardingDeck(
        original,
        [response(1)],
      ).map((item) => [
        item.mediaType,
        item.id,
      ]),
      [
        ['movie', 2],
        ['tv', 4],
        ['movie', 6],
      ],
    )
    assert.equal(original.length, 10)
  })
  it('caps new unique movies at 20 and tolerates missing poster', () => {
    const deck = prepareOnboardingDeck(Array.from({ length: 30 }, (_, i) => movie(i + 1)))
    assert.equal(deck.length, 20)
    assert.equal(deck[0].posterPath, null)
  })
  it('handles malformed upstream list', () => assert.deepEqual(prepareOnboardingDeck(null), []))

  it('keeps movie and TV with the same TMDB id as separate cards', () => {
    const deck = prepareOnboardingDeck([
      movie(123),
      movie(123, {
        mediaType: 'tv',
        title: 'Synthetic TV',
      }),
    ])

    assert.deepEqual(
      deck.map((item) => [
        item.mediaType,
        item.id,
      ]),
      [
        ['movie', 123],
        ['tv', 123],
      ],
    )
  })

  it('excludes only the exact media identity already answered', () => {
    const deck = [
      movie(123),
      movie(123, {
        mediaType: 'tv',
        title: 'Synthetic TV',
      }),
    ]

    const state = getDeckState(
      deck,
      [response(123)],
    )

    assert.deepEqual(
      state.remainingMovies.map((item) => [
        item.mediaType,
        item.id,
      ]),
      [
        ['tv', 123],
      ],
    )
  })
  it('selects the next unevaluated movie and remaining cards', () => {
    const deck = [movie(1), movie(2), movie(3)]
    assert.deepEqual(getDeckState(deck, [response(1)]), { currentMovie: deck[1], remainingMovies: deck.slice(1) })
    assert.equal(getDeckState(deck, deck.map((m) => response(m.id))).currentMovie, null)
  })
  it('requires both goals and refuses over 30 responses', () => {
    const saved = Array.from({ length: 10 }, (_, i) => response(i + 1, i < 5 ? 'like' : 'skip'))
    assert.equal(getOnboardingProgress(saved).canFinish, true)
    assert.equal(getOnboardingProgress(saved.slice(0, 9)).missingResponses, 1)
    assert.equal(getOnboardingProgress(saved.map((r) => ({ ...r, reaction: 'skip' }))).canFinish, false)
    assert.equal(getOnboardingProgress(Array.from({ length: 31 }, (_, i) => response(i + 1))).canFinish, false)
  })
  it('detects insufficient new cards for total or opinion goals', () => {
    assert.equal(canReachMinimum(getOnboardingProgress([]), 9), false)
    assert.equal(canReachMinimum(getOnboardingProgress([]), 10), true)
    const skipped = Array.from({ length: 10 }, (_, i) => response(i + 1, 'skip'))
    assert.equal(canReachMinimum(getOnboardingProgress(skipped), 4), false)
    assert.equal(canReachMinimum(getOnboardingProgress(skipped), 5), true)
    assert.equal(canReachMinimum(getOnboardingProgress(Array.from({ length: 30 }, (_, i) => response(i + 1, 'skip'))), 20), false)
  })
})

describe('Swipe and keyboard actions', () => {
  it('maps horizontal threshold boundaries', () => {
    assert.equal(getSwipeReaction(SWIPE_THRESHOLD), 'like')
    assert.equal(getSwipeReaction(-SWIPE_THRESHOLD), 'dislike')
    assert.equal(getSwipeReaction(SWIPE_THRESHOLD - 1), null)
    assert.equal(getSwipeReaction(-SWIPE_THRESHOLD + 1), null)
  })
  it('ignores vertical gestures and invalid coordinates', () => {
    assert.equal(getSwipeReaction(100, 150), null)
    assert.equal(getSwipeReaction(100, 100), null)
    assert.equal(getSwipeReaction(NaN), null)
  })
  for (const [key, action] of [['ArrowLeft', 'dislike'], ['ArrowRight', 'like'], ['ArrowDown', 'skip'], ['ArrowUp', null], ['Enter', null]]) {
    it(`maps ${key}`, () => assert.equal(getKeyboardReaction({ key }), action))
  }
  it('ignores repeat and modified shortcuts', () => {
    for (const flag of ['repeat', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey']) assert.equal(getKeyboardReaction({ key: 'ArrowRight', [flag]: true }), null)
  })
})
