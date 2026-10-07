import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  ONBOARDING_ADAPTIVE_START,
  prepareAdaptiveOnboardingDeck,
} from '../../src/features/onboarding/services/onboardingDiagnosticPlan.js'

function media(
  id,
  mediaType = 'movie',
) {
  return {
    id,
    mediaType,
    title: `${mediaType} ${id}`,
    genreIds: [],
  }
}

function response(
  tmdbId,
  reaction,
  mediaType = 'movie',
) {
  return {
    tmdbId,
    mediaType,
    reaction,
    genreIds: [],
  }
}

describe(
  'adaptive onboarding tail',
  () => {
    it(
      'keeps the original order before enough responses exist',
      () => {
        const deck = [
          media(603),
          media(597),
          media(27205),
          media(419430),
        ]

        const responses = Array.from(
          {
            length:
              ONBOARDING_ADAPTIVE_START - 1,
          },
          (_, index) => (
            response(
              100000 + index,
              'skip',
            )
          ),
        )

        assert.deepEqual(
          prepareAdaptiveOnboardingDeck(
            deck,
            responses,
          ),
          deck,
        )
      },
    )

    it(
      'does not adapt from skips alone',
      () => {
        const deck = [
          media(603),
          media(27205),
          media(419430),
          media(597),
        ]

        const responses = Array.from(
          {
            length:
              ONBOARDING_ADAPTIVE_START,
          },
          (_, index) => (
            response(
              200000 + index,
              'skip',
            )
          ),
        )

        assert.deepEqual(
          prepareAdaptiveOnboardingDeck(
            deck,
            responses,
          ),
          deck,
        )
      },
    )

    it(
      'moves an uncertain taste discriminator ahead of generic anchors',
      () => {
        const answered = [
          media(27205),       // Inception
          media(550),         // Fight Club
          media(46648, 'tv'), // True Detective
          ...Array.from(
            { length: 9 },
            (_, index) => (
              media(
                300000 + index,
              )
            ),
          ),
        ]

        const psychologicalProbe =
          media(419430) // Get Out

        const genericAnchor =
          media(238) // The Godfather

        const deck = [
          ...answered,
          genericAnchor,
          psychologicalProbe,
        ]

        const responses = [
          response(
            27205,
            'like',
          ),
          response(
            550,
            'like',
          ),
          response(
            46648,
            'dislike',
            'tv',
          ),
          ...Array.from(
            { length: 9 },
            (_, index) => (
              response(
                300000 + index,
                'skip',
              )
            ),
          ),
        ]

        const adaptive =
          prepareAdaptiveOnboardingDeck(
            deck,
            responses,
          )

        const remaining =
          adaptive.slice(answered.length)

        assert.equal(
          remaining[0].id,
          419430,
        )
      },
    )

    it(
      'does not endlessly prioritize an already strongly confirmed taste',
      () => {
        const answered = [
          media(27205),       // Inception: psychological
          media(419430),      // Get Out: psychological + supernatural
          media(46648, 'tv'), // True Detective: psychological
          ...Array.from(
            { length: 9 },
            (_, index) => (
              media(
                400000 + index,
              )
            ),
          ),
        ]

        // Fight Club carries only the already-confirmed
        // psychological-thriller taste in our diagnostic plan.
        const confirmedPsychological =
          media(550)

        // Alien explores an otherwise unseen space-sci-fi taste.
        const unexploredSpace =
          media(348)

        const deck = [
          ...answered,
          confirmedPsychological,
          unexploredSpace,
        ]

        const responses = [
          response(
            27205,
            'like',
          ),
          response(
            419430,
            'like',
          ),
          response(
            46648,
            'like',
            'tv',
          ),
          ...Array.from(
            { length: 9 },
            (_, index) => (
              response(
                400000 + index,
                'skip',
              )
            ),
          ),
        ]

        const adaptive =
          prepareAdaptiveOnboardingDeck(
            deck,
            responses,
          )

        const remaining =
          adaptive.slice(answered.length)

        assert.equal(
          remaining[0].id,
          348,
        )
      },
    )
  },
)
