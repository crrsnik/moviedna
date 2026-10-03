import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createAchievementRunner,
} from '../src/achievements/achievementRunner.js'

function media(
  tmdbId,
  mediaType = 'movie',
  extra = {},
) {
  return {
    id: `${mediaType}_${tmdbId}`,
    tmdbId,
    mediaType,
    ...extra,
  }
}

describe('achievement runner', () => {
  it('loads current sources, resolves watched metadata and persists evaluation', async () => {
    let saved = null
    let resolvedInput = null

    const store = {
      loadContext: async uid => ({
        uid,
        profile: {
          onboardingCompleted: true,
        },
        dna: {
          status: 'ready',
        },
        ratings: [
          media(1),
        ],
        savedMedia: [
          media(1, 'movie', {
            watched: true,
            favorite: true,
          }),
        ],
        friendships: [],
        previous: null,
      }),

      saveCurrent: async (uid, evaluation) => {
        saved = {
          uid,
          evaluation,
        }

        return {
          status: 'updated',
          completedCount:
            evaluation.completedCount,
          totalCount:
            evaluation.totalCount,
        }
      },
    }

    const metadataResolver = {
      async resolve(items) {
        resolvedInput = items

        return items.map(item => ({
          ...item,
          metadata: {
            genres: [
              {
                id: 27,
                label: '27',
              },
            ],
            releaseYear: 1999,
            countries: [
              {
                code: 'US',
                label: 'US',
              },
            ],
            completeness: {
              genres: true,
              releaseYear: true,
              countries: true,
            },
          },
        }))
      },
    }

    const run = createAchievementRunner({
      store,
      metadataResolver,
    })

    const result = await run('alice')

    assert.deepEqual(
      resolvedInput,
      [
        {
          mediaKey: 'movie_1',
          tmdbId: 1,
          mediaType: 'movie',
        },
      ],
    )

    assert.equal(saved.uid, 'alice')
    assert.equal(saved.evaluation.totalCount, 32)

    const states = Object.fromEntries(
      saved.evaluation.achievements.map(
        achievement => [
          achievement.id,
          achievement,
        ],
      ),
    )

    assert.equal(
      states.onboarding_complete.unlocked,
      true,
    )

    assert.equal(
      states.dna_ready.unlocked,
      true,
    )

    assert.equal(
      states.rating_1.unlocked,
      true,
    )

    assert.equal(
      states.watched_1.unlocked,
      true,
    )

    assert.deepEqual(
      result,
      {
        status: 'updated',
        completedCount:
          saved.evaluation.completedCount,
        totalCount: 32,
      },
    )
  })

  it('does not invoke metadata resolution without watched media', async () => {
    let resolveCalls = 0

    const store = {
      loadContext: async () => ({
        profile: null,
        dna: null,
        ratings: [],
        savedMedia: [],
        friendships: [],
        previous: null,
      }),

      saveCurrent: async (
        uid,
        evaluation,
      ) => ({
        uid,
        completedCount:
          evaluation.completedCount,
      }),
    }

    const metadataResolver = {
      async resolve() {
        resolveCalls += 1
        return []
      },
    }

    const run = createAchievementRunner({
      store,
      metadataResolver,
    })

    const result = await run('alice')

    assert.equal(resolveCalls, 0)
    assert.equal(result.uid, 'alice')
    assert.equal(result.completedCount, 0)
  })

  it('passes previous unlocked state into the engine', async () => {
    let saved = null

    const store = {
      loadContext: async () => ({
        profile: null,
        dna: null,
        ratings: [],
        savedMedia: [],
        friendships: [],
        previous: {
          achievements: {
            rating_10: {
              unlocked: true,
            },
          },
        },
      }),

      saveCurrent: async (
        uid,
        evaluation,
      ) => {
        saved = evaluation

        return {
          status: 'updated',
        }
      },
    }

    const metadataResolver = {
      resolve: async () => [],
    }

    const run = createAchievementRunner({
      store,
      metadataResolver,
    })

    await run('alice')

    const rating10 = saved.achievements.find(
      achievement => achievement.id === 'rating_10',
    )

    assert.equal(rating10.current, 0)
    assert.equal(rating10.unlocked, true)
    assert.equal(rating10.newlyUnlocked, false)
  })
})
