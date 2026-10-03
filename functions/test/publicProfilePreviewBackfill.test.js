import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  backfillPublicProfilePreviews,
} from '../scripts/backfillPublicProfilePreviews.js'

function createDb(userIds) {
  return {
    collection(name) {
      assert.equal(name, 'publicProfiles')

      return {
        async get() {
          return {
            docs: userIds.map((id) => ({
              id,
            })),
          }
        },
      }
    },
  }
}

function createStoreFixture(writes) {
  return () => ({
    async loadMovieDna(uid) {
      return {
        dimensions: {
          genres: [
            {
              label: `Drama-${uid}`,
              score: 0.8,
            },
          ],
        },
      }
    },

    async loadAchievements() {
      return null
    },
    async loadViewingHistory() {
      return [
        {
          schemaVersion: 1,
          mediaType: 'movie',
          watchedDate: '2026-09-01',
        },
      ]
    },

    async writePreview(uid, value) {
      writes.push({
        uid,
        value,
      })
    },
  })
}

describe('public profile preview backfill', () => {
  it('scans profiles without writing in dry-run mode', async () => {
    const writes = []

    const result = await backfillPublicProfilePreviews({
      db: createDb(['alice', 'bob']),
      dryRun: true,
      createStore: createStoreFixture(writes),
    })

    assert.deepEqual(result, {
      dryRun: true,
      scanned: 2,
      rebuilt: 2,
    })

    assert.deepEqual(writes, [])
  })

  it('rebuilds every existing profile in write mode', async () => {
    const writes = []

    const result = await backfillPublicProfilePreviews({
      db: createDb(['alice', 'bob']),
      dryRun: false,
      createStore: createStoreFixture(writes),
    })

    assert.deepEqual(result, {
      dryRun: false,
      scanned: 2,
      rebuilt: 2,
    })

    assert.equal(writes.length, 2)

    assert.deepEqual(
      writes.map((entry) => entry.uid),
      ['alice', 'bob'],
    )

    for (const entry of writes) {
      assert.equal(
        entry.value.schemaVersion,
        1,
      )

      assert.deepEqual(
        entry.value.statistics,
        {
          totalViewings: 1,
          movieCount: 1,
          tvCount: 0,
        },
      )
    }
  })
})
