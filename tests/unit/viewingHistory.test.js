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

import {
  detailToViewingSnapshot,
  localDateString,
} from '../../src/features/viewingHistory/validation/viewingHistoryValidation.js'

describe('viewing history detail conversion', () => {
  it('creates a movie viewing snapshot from detail data', () => {
    const result = detailToViewingSnapshot('movie', {
      id: 550,
      title: 'Fight Club',
      posterPath: '/poster.jpg',
      releaseYear: '1999',
      genres: [
        { id: 18, name: 'Drama' },
      ],
      directors: [
        { id: 7467, name: 'David Fincher' },
      ],
    })

    assert.deepEqual(result, {
      tmdbId: 550,
      mediaType: 'movie',
      title: 'Fight Club',
      posterPath: '/poster.jpg',
      releaseYear: 1999,
      genres: [
        { id: 18, name: 'Drama' },
      ],
      directors: [
        { id: 7467, name: 'David Fincher' },
      ],
      creators: [],
    })
  })

  it('creates a TV viewing snapshot from detail data', () => {
    const result = detailToViewingSnapshot('tv', {
      id: 1396,
      name: 'Breaking Bad',
      posterPath: '/poster.jpg',
      firstAirDate: '2008-01-20',
      genres: [
        { id: 18, name: 'Drama' },
      ],
      creators: [
        { id: 66633, name: 'Vince Gilligan' },
      ],
    })

    assert.equal(result.tmdbId, 1396)
    assert.equal(result.mediaType, 'tv')
    assert.equal(result.title, 'Breaking Bad')
    assert.equal(result.releaseYear, 2008)
    assert.deepEqual(result.directors, [])
    assert.deepEqual(result.creators, [
      { id: 66633, name: 'Vince Gilligan' },
    ])
  })

  it('formats today using local calendar fields', () => {
    const date = new Date(2026, 8, 29, 23, 30)

    assert.equal(
      localDateString(date),
      '2026-09-29',
    )
  })
})

import {
  groupViewingHistoryByMonth,
} from '../../src/features/viewingHistory/presentation/groupViewingHistory.js'

describe('viewing history presentation', () => {
  it('groups events by viewing month while preserving events', () => {
    const events = [
      {
        eventId: 'a',
        watchedDate: '2026-09-29',
      },
      {
        eventId: 'b',
        watchedDate: '2026-09-29',
      },
      {
        eventId: 'c',
        watchedDate: '2026-08-10',
      },
    ]

    const groups = groupViewingHistoryByMonth(events)

    assert.equal(groups.length, 2)
    assert.equal(groups[0].month, '2026-09')
    assert.deepEqual(
      groups[0].events.map(event => event.eventId),
      ['a', 'b'],
    )
    assert.equal(groups[1].month, '2026-08')
  })

  it('does not collapse repeated viewings of the same title', () => {
    const events = [
      {
        eventId: 'first',
        tmdbId: 550,
        watchedDate: '2026-09-29',
      },
      {
        eventId: 'second',
        tmdbId: 550,
        watchedDate: '2026-09-29',
      },
    ]

    const groups = groupViewingHistoryByMonth(events)

    assert.equal(groups[0].events.length, 2)
  })
})
