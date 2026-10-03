import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  buildPublicAchievementsPreview,
} from '../src/profilePreview/publicProfilePreview.js'

function stamp(value) {
  return {
    toDate() {
      return new Date(value)
    },
  }
}

function achievement(overrides = {}) {
  return {
    category: 'ratings',
    displayOrder: 100,
    current: 1,
    target: 10,
    unlocked: false,
    unlockedAt: null,
    ...overrides,
  }
}

describe(
  'public profile achievement preview',
  () => {
    it(
      'publishes stable achievement progress',
      () => {
        const result =
          buildPublicAchievementsPreview({
            achievements: {
              rating_10: achievement({
                displayOrder: 110,
                current: 4,
              }),

              rating_1: achievement({
                target: 1,
                current: 1,
                unlocked: true,
                unlockedAt: stamp(
                  '2026-10-03T12:00:00Z',
                ),
              }),
            },
          })

        assert.equal(
          result.completedCount,
          1,
        )

        assert.equal(
          result.totalCount,
          2,
        )

        assert.deepEqual(
          result.achievements.map(
            item => item.id,
          ),
          [
            'rating_1',
            'rating_10',
          ],
        )

        assert.equal(
          result.achievements[1].current,
          4,
        )
      },
    )

    it(
      'returns an empty collection when missing',
      () => {
        assert.deepEqual(
          buildPublicAchievementsPreview(null),
          {
            completedCount: 0,
            totalCount: 0,
            achievements: [],
          },
        )
      },
    )

    it(
      'ignores malformed achievements safely',
      () => {
        const result =
          buildPublicAchievementsPreview({
            achievements: {
              good: achievement(),
              bad: achievement({
                current: 20,
                target: 10,
              }),
            },
          })

        assert.deepEqual(
          result.achievements.map(
            item => item.id,
          ),
          ['good'],
        )
      },
    )
  },
)
