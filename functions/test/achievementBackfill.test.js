import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  backfillAchievements,
} from '../scripts/backfillAchievements.js'

describe('achievement backfill', () => {
  it('rebuilds every existing user exactly once', async () => {
    const calls = []

    const db = {
      collection(name) {
        assert.equal(name, 'users')

        return {
          async get() {
            return {
              docs: [
                { id: 'alice' },
                { id: 'bob' },
                { id: 'carol' },
              ],
            }
          },
        }
      },
    }

    const result = await backfillAchievements({
      db,
      token: 'test-token',
      dryRun: true,

      createRunner: ({
        dryRun,
        token,
      }) => {
        assert.equal(dryRun, true)
        assert.equal(token, 'test-token')

        return async uid => {
          calls.push(uid)
        }
      },
    })

    assert.deepEqual(
      calls,
      ['alice', 'bob', 'carol'],
    )

    assert.deepEqual(
      result,
      {
        dryRun: true,
        scanned: 3,
        rebuilt: 3,
      },
    )
  })
})
