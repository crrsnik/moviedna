import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  AchievementDocumentError,
  normalizeAchievementsCurrent,
} from '../../src/features/achievements/services/normalizeAchievements.js'

import {
  createAchievementService,
} from '../../src/features/achievements/services/createAchievementService.js'

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
    target: 1,
    unlocked: true,
    unlockedAt: stamp(
      '2026-10-03T18:00:00.000Z',
    ),
    ...overrides,
  }
}

function data(overrides = {}) {
  return {
    schemaVersion: 1,
    completedCount: 1,
    totalCount: 2,
    achievements: {
      rating_1: achievement(),
      rating_10: achievement({
        displayOrder: 110,
        current: 1,
        target: 10,
        unlocked: false,
        unlockedAt: null,
      }),
    },
    updatedAt: stamp(
      '2026-10-03T19:00:00.000Z',
    ),
    ...overrides,
  }
}

function snapshot(value = data()) {
  return {
    exists: () => value !== null,
    data: () => value,
  }
}

describe('achievement read model', () => {
  it('normalizes the current achievement snapshot', () => {
    const result =
      normalizeAchievementsCurrent(
        snapshot(),
      )

    assert.equal(result.schemaVersion, 1)
    assert.equal(result.completedCount, 1)
    assert.equal(result.totalCount, 2)

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
      result.achievements[0]
        .unlockedAt
        .toISOString(),
      '2026-10-03T18:00:00.000Z',
    )
  })

  it('returns null when backend state does not exist yet', () => {
    assert.equal(
      normalizeAchievementsCurrent(
        snapshot(null),
      ),
      null,
    )
  })

  it('rejects unsupported schema versions', () => {
    assert.throws(
      () => normalizeAchievementsCurrent(
        snapshot(
          data({
            schemaVersion: 2,
          }),
        ),
      ),
      error => (
        error instanceof AchievementDocumentError
        && error.code === 'unsupported-version'
      ),
    )
  })

  it('rejects inconsistent completed counts', () => {
    assert.throws(
      () => normalizeAchievementsCurrent(
        snapshot(
          data({
            completedCount: 2,
          }),
        ),
      ),
      {
        code: 'malformed',
      },
    )
  })

  it('rejects duplicate display order values', () => {
    const value = data()

    value.achievements.rating_10.displayOrder = 100

    assert.throws(
      () => normalizeAchievementsCurrent(
        snapshot(value),
      ),
      {
        code: 'malformed',
      },
    )
  })

  it('rejects invalid progress', () => {
    const value = data()

    value.achievements.rating_10.current = 11

    assert.throws(
      () => normalizeAchievementsCurrent(
        snapshot(value),
      ),
      {
        code: 'malformed',
      },
    )
  })

  it('rejects unlocked achievements without unlockedAt', () => {
    const value = data()

    value.achievements.rating_1.unlockedAt = null

    assert.throws(
      () => normalizeAchievementsCurrent(
        snapshot(value),
      ),
      {
        code: 'malformed',
      },
    )
  })
})

describe('achievement subscription service', () => {
  it('subscribes only to achievements/current', () => {
    const listeners = []

    const service = createAchievementService({
      database: 'db',

      document: (
        database,
        ...parts
      ) => {
        assert.equal(database, 'db')
        return parts.join('/')
      },

      subscribe: (
        path,
        options,
        next,
        error,
      ) => {
        listeners.push({
          path,
          options,
          next,
          error,
        })

        return () => {}
      },
    })

    service.subscribe(
      'owner',
      () => {},
      () => {},
    )

    assert.equal(
      listeners[0].path,
      'users/owner/achievements/current',
    )

    assert.deepEqual(
      listeners[0].options,
      {
        includeMetadataChanges: true,
      },
    )
  })

  it('normalizes subscribed data', () => {
    let listener
    let received = null

    const service = createAchievementService({
      database: 'db',
      document: (
        _database,
        ...parts
      ) => parts.join('/'),

      subscribe: (
        _path,
        _options,
        next,
      ) => {
        listener = next
        return () => {}
      },
    })

    service.subscribe(
      'owner',
      value => {
        received = value
      },
    )

    listener(snapshot())

    assert.equal(
      received.completedCount,
      1,
    )
  })

  it('maps malformed snapshots to a safe error', () => {
    let listener
    let receivedError = null

    const service = createAchievementService({
      database: 'db',
      document: (
        _database,
        ...parts
      ) => parts.join('/'),

      subscribe: (
        _path,
        _options,
        next,
      ) => {
        listener = next
        return () => {}
      },
    })

    service.subscribe(
      'owner',
      () => assert.fail(),
      error => {
        receivedError = error
      },
    )

    listener(
      snapshot({
        schemaVersion: 999,
      }),
    )

    assert.equal(
      receivedError.code,
      'unsupported-version',
    )
  })

  it('rejects invalid user IDs before reaching Firebase', () => {
    let subscribed = false
    let receivedError = null

    const service = createAchievementService({
      database: 'db',
      document: () => 'unexpected',
      subscribe: () => {
        subscribed = true
        return () => {}
      },
    })

    service.subscribe(
      'bad/user',
      () => {},
      error => {
        receivedError = error
      },
    )

    assert.equal(subscribed, false)
    assert.equal(
      receivedError.code,
      'invalid-user',
    )
  })
})
