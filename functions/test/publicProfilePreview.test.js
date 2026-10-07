import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildPublicDnaPreview,
  buildPublicStatisticsPreview,
  createPublicProfilePreviewHandlers,
} from '../src/profilePreview/publicProfilePreview.js'

function snapshot(data, exists = true) {
  return {
    exists,
    data: () => data,
  }
}

describe('public profile preview projection', () => {
  it('keeps only four strongest positive DNA genres', () => {
    const result = buildPublicDnaPreview({
      dimensions: {
        genres: [
          { label: 'Comedy', score: 0.2 },
          { label: 'Drama', score: 0.8 },
          { label: 'Thriller', score: 0.6 },
          { label: 'Sci-Fi', score: 0.7 },
          { label: 'Mystery', score: 0.5 },
          { label: 'Horror', score: -0.4 },
          { label: 'Neutral', score: 0 },
        ],
      },
    })

    assert.deepEqual(result, {
      genres: [
        { label: 'Drama', score: 0.8 },
        { label: 'Sci-Fi', score: 0.7 },
        { label: 'Thriller', score: 0.6 },
        { label: 'Mystery', score: 0.5 },
      ],
    })
  })

  it('resolves raw numeric genre labels from canonical genre keys', () => {
    const result = buildPublicDnaPreview({
      dimensions: {
        genres: [
          {
            key: 'genre:18',
            label: '18',
            score: 0.82,
          },
          {
            key: 'genre:28',
            label: '28',
            score: 0.71,
          },
          {
            key: 'genre:878',
            label: '878',
            score: 0.64,
          },
        ],
      },
    })

    assert.deepEqual(result, {
      genres: [
        {
          label: 'Drama',
          score: 0.82,
        },
        {
          label: 'Action',
          score: 0.71,
        },
        {
          label: 'Science Fiction',
          score: 0.64,
        },
      ],
    })
  })

  it('exposes no DNA source evidence or private metadata', () => {
    const result = buildPublicDnaPreview({
      dimensions: {
        genres: [{
          label: 'Drama',
          score: 0.8,
          confidence: 0.9,
          evidenceCount: 15,
          signedContribution: 123,
          absoluteEvidenceWeight: 456,
        }],
      },
      sourceCounts: {
        ratingsRead: 100,
      },
    })

    assert.deepEqual(result, {
      genres: [
        {
          label: 'Drama',
          score: 0.8,
        },
      ],
    })
  })

  it('calculates only aggregate viewing totals', () => {
    const result = buildPublicStatisticsPreview([
      {
        schemaVersion: 1,
        mediaType: 'movie',
        watchedDate: '2026-09-01',
        title: 'Private movie title',
      },
      {
        schemaVersion: 1,
        mediaType: 'movie',
        watchedDate: '2026-09-02',
      },
      {
        schemaVersion: 1,
        mediaType: 'tv',
        watchedDate: '2026-09-03',
      },
      {
        schemaVersion: 2,
        mediaType: 'movie',
        watchedDate: '2026-09-04',
      },
      {
        schemaVersion: 1,
        mediaType: 'invalid',
        watchedDate: '2026-09-05',
      },
    ])

    assert.deepEqual(result, {
      totalViewings: 3,
      movieCount: 2,
      tvCount: 1,
    })

    assert.equal('title' in result, false)
  })

  it('updates DNA projection while the profile is private', async () => {
    const calls = []

    const handlers = createPublicProfilePreviewHandlers({
      mergePreview: async (...args) => calls.push(args),
    })

    const result = await handlers.movieDnaWrite({
      params: {
        uid: 'alice',
      },
      data: {
        after: snapshot({
          dimensions: {
            genres: [
              {
                label: 'Drama',
                score: 0.8,
              },
            ],
          },
        }),
      },
    })

    assert.deepEqual(result, {
      status: 'updated',
    })

    assert.deepEqual(calls, [
      [
        'alice',
        {
          dna: {
            genres: [
              {
                label: 'Drama',
                score: 0.8,
              },
            ],
          },
        },
      ],
    ])
  })

  it('updates DNA projection after a public DNA write', async () => {
    const calls = []

    const handlers = createPublicProfilePreviewHandlers({
      mergePreview: async (...args) => calls.push(args),
    })

    const result = await handlers.movieDnaWrite({
      params: {
        uid: 'alice',
      },
      data: {
        after: snapshot({
          dimensions: {
            genres: [
              {
                label: 'Drama',
                score: 0.8,
              },
            ],
          },
        }),
      },
    })

    assert.deepEqual(result, {
      status: 'updated',
    })

    assert.deepEqual(calls, [
      [
        'alice',
        {
          dna: {
            genres: [
              {
                label: 'Drama',
                score: 0.8,
              },
            ],
          },
        },
      ],
    ])
  })

  it('recalculates statistics after viewing history changes', async () => {
    const writes = []

    const handlers = createPublicProfilePreviewHandlers({
      loadAchievements: async () => null,
      loadViewingHistory: async () => [
        {
          schemaVersion: 1,
          mediaType: 'movie',
          watchedDate: '2026-09-01',
        },
        {
          schemaVersion: 1,
          mediaType: 'tv',
          watchedDate: '2026-09-02',
        },
      ],

      mergePreview: async (...args) => writes.push(args),
    })

    const result = await handlers.viewingHistoryWrite({
      params: {
        uid: 'alice',
      },
    })

    assert.deepEqual(result, {
      status: 'updated',
    })

    assert.deepEqual(writes[0], [
      'alice',
      {
        statistics: {
          totalViewings: 2,
          movieCount: 1,
          tvCount: 1,
        },
      },
    ])
  })

  it('builds the complete projection when a profile becomes public', async () => {
    const writes = []

    const handlers = createPublicProfilePreviewHandlers({
      loadMovieDna: async () => ({
        dimensions: {
          genres: [
            {
              label: 'Drama',
              score: 0.9,
            },
          ],
        },
      }),

      loadAchievements: async () => null,
      loadViewingHistory: async () => [
        {
          schemaVersion: 1,
          mediaType: 'movie',
          watchedDate: '2026-09-01',
        },
      ],

      writePreview: async (...args) => writes.push(args),
    })

    const result = await handlers.publicProfileWrite({
      params: {
        uid: 'alice',
      },
      data: {
        before: snapshot({
          profileVisibility: 'private',
        }),
        after: snapshot({
          profileVisibility: 'public',
        }),
      },
    })

    
assert.deepEqual(result, {
      status: 'rebuilt',
    })

    assert.deepEqual(writes[0], [
      'alice',
      {
        schemaVersion: 1,
        achievements: {
          completedCount: 0,
          totalCount: 0,
          achievements: [],
        },
        dna: {
          genres: [
            {
              label: 'Drama',
              score: 0.9,
            },
          ],
        },
        statistics: {
          totalViewings: 1,
          movieCount: 1,
          tvCount: 0,
        },
      },
    ])
  })

  it('rebuilds the projection when a profile becomes private', async () => {
    const writes = []

    const handlers = createPublicProfilePreviewHandlers({
      loadMovieDna: async () => ({
        dimensions: {
          genres: [
            {
              label: 'Drama',
              score: 0.7,
            },
          ],
        },
      }),

      loadAchievements: async () => null,
      loadViewingHistory: async () => [
        {
          schemaVersion: 1,
          mediaType: 'tv',
          watchedDate: '2026-09-01',
        },
      ],

      writePreview: async (...args) => writes.push(args),
    })

    const result = await handlers.publicProfileWrite({
      params: {
        uid: 'alice',
      },
      data: {
        before: snapshot({
          profileVisibility: 'public',
        }),
        after: snapshot({
          profileVisibility: 'private',
        }),
      },
    })

    
assert.deepEqual(result, {
      status: 'rebuilt',
    })

    assert.deepEqual(writes, [
      [
        'alice',
        {
          schemaVersion: 1,
          achievements: {
            completedCount: 0,
            totalCount: 0,
            achievements: [],
          },
          dna: {
            genres: [
              {
                label: 'Drama',
                score: 0.7,
              },
            ],
          },
          statistics: {
            totalViewings: 1,
            movieCount: 0,
            tvCount: 1,
          },
        },
      ],
    ])
  })
})


describe('public profile DNA trait projection', () => {
  it('selects diverse strongest DNA traits across preview dimensions', () => {
    const result = buildPublicDnaPreview({
      dimensions: {
        genres: [
          {
            key: 'genre:18',
            label: 'Drama',
            score: 0.95,
            confidence: 0.8,
          },
          {
            key: 'genre:53',
            label: 'Thriller',
            score: 0.94,
            confidence: 0.9,
          },
        ],

        mediaTypes: [
          {
            key: 'media:movie',
            label: 'Movies',
            score: 0.9,
            confidence: 0.9,
          },
        ],

        decades: [
          {
            key: 'decade:2020',
            label: '2020s',
            score: 0.8,
            confidence: 0.8,
          },
        ],

        countries: [
          {
            key: 'country:US',
            label: 'US',
            score: 0.7,
            confidence: 0.9,
          },
        ],

        directors: [
          {
            key: 'person:10',
            label: 'Director A',
            score: 0.6,
            confidence: 0.9,
          },
        ],

        actors: [
          {
            key: 'person:20',
            label: 'Actor A',
            score: 0.5,
            confidence: 0.9,
          },
        ],
      },
    })

    assert.deepEqual(
      result.traits,
      [
        {
          dimension: 'genres',
          key: 'genre:18',
          label: 'Drama',
          score: 0.95,
        },
        {
          dimension: 'mediaTypes',
          key: 'media:movie',
          label: 'Movies',
          score: 0.9,
        },
        {
          dimension: 'decades',
          key: 'decade:2020',
          label: '2020s',
          score: 0.8,
        },
        {
          dimension: 'countries',
          key: 'country:US',
          label: 'US',
          score: 0.7,
        },
      ],
    )
  })
})
