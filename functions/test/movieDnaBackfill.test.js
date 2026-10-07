import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  backfillMovieDna,
} from '../scripts/backfillMovieDna.js'

function fakeDb(userIds) {
  return {
    collection(name) {
      assert.equal(name, 'users')

      return {
        async get() {
          return {
            docs: userIds.map(
              id => ({ id }),
            ),
          }
        },
      }
    },
  }
}

describe(
  'MovieDNA backfill',
  () => {
    it(
      'runs every user in dry-run mode',
      async () => {
        const calls = []

        const result =
          await backfillMovieDna({
            db: fakeDb([
              'user-a',
              'user-b',
              'user-c',
            ]),
            token: 'test-token',
            dryRun: true,

            createRunner(options) {
              assert.equal(
                options.dryRun,
                true,
              )

              assert.equal(
                options.token,
                'test-token',
              )

              return async uid => {
                calls.push(uid)
              }
            },
          })

        assert.deepEqual(
          calls,
          [
            'user-a',
            'user-b',
            'user-c',
          ],
        )

        assert.deepEqual(
          result,
          {
            dryRun: true,
            scanned: 3,
            rebuilt: 3,
            failed: 0,
            failures: [],
          },
        )
      },
    )

    it(
      'continues after one user fails',
      async () => {
        const calls = []

        const result =
          await backfillMovieDna({
            db: fakeDb([
              'good-a',
              'bad-user',
              'good-b',
            ]),
            token: 'test-token',
            dryRun: false,

            createRunner() {
              return async uid => {
                calls.push(uid)

                if (uid === 'bad-user') {
                  const error =
                    new Error(
                      'Synthetic failure',
                    )

                  error.code =
                    'synthetic-error'

                  throw error
                }
              }
            },
          })

        assert.deepEqual(
          calls,
          [
            'good-a',
            'bad-user',
            'good-b',
          ],
        )

        assert.equal(
          result.scanned,
          3,
        )

        assert.equal(
          result.rebuilt,
          2,
        )

        assert.equal(
          result.failed,
          1,
        )

        assert.deepEqual(
          result.failures,
          [{
            uid: 'bad-user',
            code: 'synthetic-error',
            message:
              'Synthetic failure',
          }],
        )
      },
    )
  },
)
