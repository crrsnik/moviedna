import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ACHIEVEMENT_DEFINITIONS,
} from '../src/achievements/achievementDefinitions.js'

import {
  achievementStateById,
  evaluateAchievements,
  normalizeAchievementMetric,
} from '../src/achievements/achievementEngine.js'

describe('achievement definitions', () => {
  it('contains a substantial initial achievement catalog', () => {
    assert.equal(ACHIEVEMENT_DEFINITIONS.length, 32)
  })

  it('uses unique ids and display orders', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map(({ id }) => id)
    const orders = ACHIEVEMENT_DEFINITIONS.map(
      ({ displayOrder }) => displayOrder,
    )

    assert.equal(new Set(ids).size, ids.length)
    assert.equal(new Set(orders).size, orders.length)
  })

  it('uses valid immutable definition contracts', () => {
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      assert.equal(Object.isFrozen(definition), true)
      assert.match(definition.id, /^[a-z0-9_]+$/)
      assert.equal(typeof definition.category, 'string')
      assert.equal(typeof definition.metric, 'string')
      assert.equal(
        Number.isSafeInteger(definition.displayOrder),
        true,
      )
      assert.equal(
        Number.isSafeInteger(definition.target),
        true,
      )
      assert.ok(definition.target > 0)
    }
  })
})

describe('achievement metric normalization', () => {
  it('supports boolean achievement metrics', () => {
    assert.equal(normalizeAchievementMetric(true), 1)
    assert.equal(normalizeAchievementMetric(false), 0)
  })

  it('accepts safe non-negative numeric progress', () => {
    assert.equal(normalizeAchievementMetric(12), 12)
    assert.equal(normalizeAchievementMetric(12.9), 12)
    assert.equal(normalizeAchievementMetric(0), 0)
  })

  it('treats malformed progress as zero', () => {
    assert.equal(normalizeAchievementMetric(-1), 0)
    assert.equal(normalizeAchievementMetric(NaN), 0)
    assert.equal(normalizeAchievementMetric(Infinity), 0)
    assert.equal(normalizeAchievementMetric('10'), 0)
    assert.equal(normalizeAchievementMetric(null), 0)
  })
})

describe('achievement engine', () => {
  it('returns locked zero progress for an empty profile', () => {
    const result = evaluateAchievements()
    const state = achievementStateById(result.achievements)

    assert.equal(result.completedCount, 0)
    assert.equal(result.totalCount, 32)

    assert.deepEqual(
      {
        current: state.rating_10.current,
        target: state.rating_10.target,
        unlocked: state.rating_10.unlocked,
        newlyUnlocked: state.rating_10.newlyUnlocked,
      },
      {
        current: 0,
        target: 10,
        unlocked: false,
        newlyUnlocked: false,
      },
    )
  })

  it('evaluates nested metrics and unlocks reached targets', () => {
    const result = evaluateAchievements({
      metrics: {
        profile: {
          onboardingCompleted: true,
        },
        dna: {
          ready: true,
        },
        ratings: {
          total: 12,
        },
        watched: {
          total: 28,
          movies: 18,
          tv: 10,
          distinctGenres: 7,
          distinctDecades: 4,
          distinctCountries: 3,
          byGenre: {
            27: 11,
            35: 4,
          },
        },
        favorites: {
          total: 6,
        },
        friends: {
          accepted: 1,
        },
      },
    })

    const state = achievementStateById(result.achievements)

    assert.equal(state.onboarding_complete.unlocked, true)
    assert.equal(state.dna_ready.unlocked, true)

    assert.equal(state.rating_10.unlocked, true)
    assert.equal(state.rating_25.unlocked, false)

    assert.equal(state.watched_25.unlocked, true)
    assert.equal(state.watched_50.unlocked, false)

    assert.equal(state.movies_10.unlocked, true)
    assert.equal(state.tv_10.unlocked, true)

    assert.equal(state.horror_10.unlocked, true)
    assert.equal(state.comedy_10.unlocked, false)

    assert.equal(state.friend_1.unlocked, true)
    assert.equal(state.friends_5.unlocked, false)
  })

  it('caps displayed progress at the achievement target', () => {
    const result = evaluateAchievements({
      metrics: {
        ratings: {
          total: 140,
        },
      },
    })

    const state = achievementStateById(result.achievements)

    assert.equal(state.rating_100.current, 100)
    assert.equal(state.rating_100.target, 100)
    assert.equal(state.rating_100.unlocked, true)
    assert.equal(state.rating_100.newlyUnlocked, true)
  })

  it('reports newly unlocked achievements only on the transition', () => {
    const first = evaluateAchievements({
      metrics: {
        ratings: {
          total: 10,
        },
      },
    })

    const firstState = achievementStateById(first.achievements)

    assert.equal(firstState.rating_10.unlocked, true)
    assert.equal(firstState.rating_10.newlyUnlocked, true)

    const second = evaluateAchievements({
      metrics: {
        ratings: {
          total: 10,
        },
      },
      previous: firstState,
    })

    const secondState = achievementStateById(second.achievements)

    assert.equal(secondState.rating_10.unlocked, true)
    assert.equal(secondState.rating_10.newlyUnlocked, false)
  })

  it('never revokes an achievement that was already unlocked', () => {
    const result = evaluateAchievements({
      metrics: {
        ratings: {
          total: 2,
        },
      },
      previous: {
        rating_10: {
          unlocked: true,
        },
      },
    })

    const state = achievementStateById(result.achievements)

    assert.equal(state.rating_10.current, 2)
    assert.equal(state.rating_10.unlocked, true)
    assert.equal(state.rating_10.newlyUnlocked, false)
  })

  it('ignores unknown previous achievement ids', () => {
    const result = evaluateAchievements({
      previous: {
        achievement_that_no_longer_exists: {
          unlocked: true,
        },
      },
    })

    assert.equal(result.completedCount, 0)
    assert.equal(result.totalCount, 32)
  })

  it('preserves catalog display order', () => {
    const result = evaluateAchievements()

    assert.deepEqual(
      result.achievements.map(({ displayOrder }) => displayOrder),
      [...result.achievements]
        .map(({ displayOrder }) => displayOrder)
        .sort((a, b) => a - b),
    )
  })
})
