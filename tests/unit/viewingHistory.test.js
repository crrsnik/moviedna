import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  validateViewingEventId,
  validateWatchedDate,
  viewingHistoryMediaSnapshot,
} from '../../src/features/viewingHistory/validation/viewingHistoryValidation.js'

import {
  normalizeViewingEvent,
  normalizeViewingHistory,
} from '../../src/features/viewingHistory/services/normalizeViewingHistory.js'

const stamp = value => ({
  toDate: () => new Date(value),
})

function movie(overrides = {}) {
  return {
    tmdbId: 550,
    mediaType: 'movie',
    title: 'Fight Club',
    posterPath: '/poster.jpg',
    releaseYear: 1999,
    genres: [
      { id: 18, name: 'Drama' },
      { id: 53, name: 'Thriller' },
    ],
    directors: [
      { id: 7467, name: 'David Fincher' },
    ],
    creators: [],
    ...overrides,
  }
}

function data(overrides = {}) {
  return {
    schemaVersion: 1,
    ...movie(),
    watchedDate: '2026-09-29',
    createdAt: stamp('2026-09-29T20:00:00Z'),
    updatedAt: stamp('2026-09-29T20:00:00Z'),
    ...overrides,
  }
}

function snapshot(
  id = 'ABCDEFGHIJKLMNOPQRST',
  value = data(),
) {
  return {
    id,
    data: () => value,
  }
}

describe('viewing history validation', () => {
  it('accepts valid calendar dates', () => {
    assert.equal(
      validateWatchedDate('2026-09-29'),
      '2026-09-29',
    )

    assert.equal(
      validateWatchedDate('2024-02-29'),
      '2024-02-29',
    )
  })

  it('rejects malformed or impossible dates', () => {
    for (const value of [
      '',
      '2026-9-29',
      '2026-02-30',
      '2025-02-29',
      '2026-13-01',
      '1899-01-01',
      null,
    ]) {
      assert.throws(
        () => validateWatchedDate(value),
        { code: 'invalid-date' },
      )
    }
  })

  it('accepts only Firestore-style event IDs', () => {
    assert.equal(
      validateViewingEventId('ABCDEFGHIJKLMNOPQRST'),
      'ABCDEFGHIJKLMNOPQRST',
    )

    for (const value of [
      '',
      'short',
      'ABCDEFGHIJKLMNOPQRS!',
      'ABCDEFGHIJKLMNOPQRSTU',
      null,
    ]) {
      assert.throws(
        () => validateViewingEventId(value),
        { code: 'invalid-event' },
      )
    }
  })

  it('normalizes movie metadata for statistics', () => {
    const result = viewingHistoryMediaSnapshot({
      ...movie(),
      genres: [
        { id: 53, name: ' Thriller ' },
        { id: 18, name: 'Drama' },
        { id: 53, name: 'Duplicate' },
      ],
    })

    assert.deepEqual(result.genres, [
      { id: 18, name: 'Drama' },
      { id: 53, name: 'Thriller' },
    ])

    assert.deepEqual(result.directors, [
      { id: 7467, name: 'David Fincher' },
    ])

    assert.deepEqual(result.creators, [])
  })

  it('keeps creators for TV and removes directors', () => {
    const result = viewingHistoryMediaSnapshot({
      ...movie({
        mediaType: 'tv',
        tmdbId: 1396,
        title: 'Breaking Bad',
        directors: [{ id: 1, name: 'Ignored' }],
        creators: [{ id: 66633, name: 'Vince Gilligan' }],
      }),
    })

    assert.deepEqual(result.directors, [])
    assert.deepEqual(result.creators, [
      { id: 66633, name: 'Vince Gilligan' },
    ])
  })
})

describe('viewing history normalization', () => {
  it('normalizes one persisted event', () => {
    const result = normalizeViewingEvent(snapshot())

    assert.equal(result.eventId, 'ABCDEFGHIJKLMNOPQRST')
    assert.equal(result.tmdbId, 550)
    assert.equal(result.mediaType, 'movie')
    assert.equal(result.watchedDate, '2026-09-29')
    assert.equal(
      result.createdAt,
      '2026-09-29T20:00:00.000Z',
    )
  })

  it('sorts newest viewing dates first', () => {
    const result = normalizeViewingHistory({
      docs: [
        snapshot(
          'ABCDEFGHIJKLMNOPQRST',
          data({ watchedDate: '2025-01-01' }),
        ),
        snapshot(
          'QRSTUVWXYZABCDEFGHIJ',
          data({ watchedDate: '2026-09-29' }),
        ),
      ],
    })

    assert.deepEqual(
      result.map(item => item.watchedDate),
      ['2026-09-29', '2025-01-01'],
    )
  })

  it('ignores a malformed record without losing valid history', () => {
    const result = normalizeViewingHistory({
      docs: [
        snapshot(),
        snapshot(
          '12345678901234567890',
          data({ watchedDate: '2026-02-30' }),
        ),
      ],
    })

    assert.equal(result.length, 1)
    assert.equal(
      result[0].eventId,
      'ABCDEFGHIJKLMNOPQRST',
    )
  })
})
