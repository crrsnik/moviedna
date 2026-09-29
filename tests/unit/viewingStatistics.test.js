import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  calculateViewingStats,
} from '../../src/features/statistics/core/calculateViewingStats.js'

const movie = (overrides = {}) => ({
  eventId: 'event',
  tmdbId: 1,
  mediaType: 'movie',
  title: 'Movie',
  releaseYear: 2014,
  watchedDate: '2026-09-20',
  genres: [
    { id: 18, name: 'Drama' },
  ],
  directors: [
    { id: 1, name: 'Director A' },
  ],
  creators: [],
  ...overrides,
})

const tv = (overrides = {}) => ({
  eventId: 'tv-event',
  tmdbId: 2,
  mediaType: 'tv',
  title: 'TV',
  releaseYear: 2008,
  watchedDate: '2026-08-10',
  genres: [
    { id: 18, name: 'Drama' },
    { id: 80, name: 'Crime' },
  ],
  directors: [],
  creators: [
    { id: 2, name: 'Creator A' },
  ],
  ...overrides,
})

describe('viewing statistics', () => {
  it('returns empty statistics for empty history', () => {
    const result = calculateViewingStats(
      [],
      '2026-09-29',
    )

    assert.equal(result.totalViewings, 0)
    assert.equal(result.thisMonth, 0)
    assert.equal(result.thisYear, 0)
    assert.equal(result.mediaTypes.movieCount, 0)
    assert.equal(result.mediaTypes.tvCount, 0)
    assert.equal(result.monthlyActivity.length, 9)
    assert.deepEqual(result.topGenres, [])
  })

  it('calculates month, year and all-time totals', () => {
    const result = calculateViewingStats([
      movie({
        watchedDate: '2026-09-01',
      }),
      movie({
        watchedDate: '2026-08-01',
      }),
      movie({
        watchedDate: '2025-12-31',
      }),
    ], '2026-09-29')

    assert.equal(result.totalViewings, 3)
    assert.equal(result.thisMonth, 1)
    assert.equal(result.thisYear, 2)
  })

  it('counts rewatches as separate viewing events', () => {
    const result = calculateViewingStats([
      movie({
        eventId: 'first',
        tmdbId: 550,
      }),
      movie({
        eventId: 'second',
        tmdbId: 550,
      }),
    ], '2026-09-29')

    assert.equal(result.totalViewings, 2)
    assert.equal(result.mediaTypes.movieCount, 2)
    assert.equal(result.topGenres[0].count, 2)
    assert.equal(result.topDirectors[0].count, 2)
  })

  it('calculates movie versus TV counts and shares', () => {
    const result = calculateViewingStats([
      movie(),
      movie({ eventId: 'second' }),
      tv(),
    ], '2026-09-29')

    assert.equal(result.mediaTypes.movieCount, 2)
    assert.equal(result.mediaTypes.tvCount, 1)
    assert.equal(
      result.mediaTypes.movieShare,
      0.666667,
    )
    assert.equal(
      result.mediaTypes.tvShare,
      0.333333,
    )
  })

  it('builds current-year monthly activity through the current month', () => {
    const result = calculateViewingStats([
      movie({
        watchedDate: '2026-01-03',
      }),
      movie({
        watchedDate: '2026-09-01',
      }),
      tv({
        watchedDate: '2026-09-15',
      }),
      movie({
        watchedDate: '2025-09-15',
      }),
    ], '2026-09-29')

    assert.equal(result.monthlyActivity.length, 9)
    assert.deepEqual(result.monthlyActivity[0], {
      month: '2026-01',
      count: 1,
    })
    assert.deepEqual(result.monthlyActivity[8], {
      month: '2026-09',
      count: 2,
    })
  })

  it('ranks genres by number of watched events', () => {
    const result = calculateViewingStats([
      movie(),
      tv(),
      movie({
        eventId: 'comedy',
        genres: [
          { id: 35, name: 'Comedy' },
        ],
      }),
    ], '2026-09-29')

    assert.deepEqual(result.topGenres, [
      { id: 18, name: 'Drama', count: 2 },
      { id: 35, name: 'Comedy', count: 1 },
      { id: 80, name: 'Crime', count: 1 },
    ])
  })

  it('separates top movie directors and TV creators', () => {
    const result = calculateViewingStats([
      movie(),
      movie({
        eventId: 'second',
        directors: [
          { id: 1, name: 'Director A' },
        ],
      }),
      tv(),
    ], '2026-09-29')

    assert.deepEqual(result.topDirectors, [
      { id: 1, name: 'Director A', count: 2 },
    ])

    assert.deepEqual(result.topCreators, [
      { id: 2, name: 'Creator A', count: 1 },
    ])
  })

  it('ranks release decades and counts rewatches', () => {
    const result = calculateViewingStats([
      movie({ releaseYear: 2014 }),
      movie({
        eventId: 'rewatch',
        releaseYear: 2014,
      }),
      tv({ releaseYear: 2008 }),
    ], '2026-09-29')

    assert.deepEqual(result.topDecades, [
      {
        decade: 2010,
        label: '2010s',
        count: 2,
      },
      {
        decade: 2000,
        label: '2000s',
        count: 1,
      },
    ])
  })

  it('ignores malformed and future viewing events', () => {
    const result = calculateViewingStats([
      movie(),
      movie({
        eventId: 'future',
        watchedDate: '2026-10-01',
      }),
      movie({
        eventId: 'invalid-date',
        watchedDate: '2026-02-30',
      }),
      movie({
        eventId: 'invalid-type',
        mediaType: 'person',
      }),
    ], '2026-09-29')

    assert.equal(result.totalViewings, 1)
  })

  it('rejects invalid inputs', () => {
    assert.throws(
      () => calculateViewingStats(
        null,
        '2026-09-29',
      ),
      TypeError,
    )

    assert.throws(
      () => calculateViewingStats(
        [],
        '2026-02-30',
      ),
      TypeError,
    )
  })
})
