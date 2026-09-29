import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeTmdbDiscoveryCandidate,
  prepareRecommendationCandidate,
  recommendationMetadataFromResolved,
} from '../../functions/src/recommendations/core/prepareRecommendationCandidates.js'

function completeMetadata(overrides = {}) {
  return {
    status: 'ready',
    genres: [{ id: 28, label: 'Action' }],
    releaseYear: 2014,
    originalLanguage: { code: 'en', label: 'English' },
    countries: [{ code: 'US', label: 'United States' }],
    directors: [{ id: 100, name: 'Director' }],
    creators: [],
    actors: [
      { id: 200, name: 'Actor', billingOrder: 0 },
      { id: 201, name: 'Actor 2', billingOrder: 1 },
    ],
    completeness: {
      genres: true,
      releaseYear: true,
      originalLanguage: true,
      countries: true,
      people: true,
    },
    ...overrides,
  }
}

describe('recommendation candidate preparation', () => {
  it('normalizes movie discovery results', () => {
    assert.deepEqual(
      normalizeTmdbDiscoveryCandidate({
        id: 550,
        title: ' Fight Club ',
        popularity: 50.5,
      }, 'movie'),
      {
        mediaKey: 'movie_550',
        tmdbId: 550,
        mediaType: 'movie',
        title: 'Fight Club',
        popularity: 50.5,
      },
    )
  })

  it('normalizes TV discovery results using name', () => {
    assert.deepEqual(
      normalizeTmdbDiscoveryCandidate({
        id: 1399,
        name: ' Game of Thrones ',
        popularity: 80,
      }, 'tv'),
      {
        mediaKey: 'tv_1399',
        tmdbId: 1399,
        mediaType: 'tv',
        title: 'Game of Thrones',
        popularity: 80,
      },
    )
  })

  it('supports media_type from mixed TMDB results and rejects people', () => {
    assert.equal(
      normalizeTmdbDiscoveryCandidate({
        id: 10,
        media_type: 'person',
        name: 'Person',
        popularity: 1,
      }),
      null,
    )

    assert.deepEqual(
      normalizeTmdbDiscoveryCandidate({
        id: 11,
        media_type: 'movie',
        title: 'Movie',
        popularity: 2,
      }),
      {
        mediaKey: 'movie_11',
        tmdbId: 11,
        mediaType: 'movie',
        title: 'Movie',
        popularity: 2,
      },
    )
  })

  it('adapts complete movie metadata to the ranking contract', () => {
    assert.deepEqual(
      recommendationMetadataFromResolved(
        completeMetadata(),
        'movie',
      ),
      {
        genreIds: [28],
        releaseYear: 2014,
        originalLanguage: 'en',
        countryCodes: ['US'],
        actors: [{ id: 200 }, { id: 201 }],
        directors: [{ id: 100 }],
      },
    )
  })

  it('adapts TV creators without adding directors', () => {
    const metadata = completeMetadata({
      directors: [],
      creators: [{ id: 300, name: 'Creator' }],
    })

    assert.deepEqual(
      recommendationMetadataFromResolved(metadata, 'tv'),
      {
        genreIds: [28],
        releaseYear: 2014,
        originalLanguage: 'en',
        countryCodes: ['US'],
        actors: [{ id: 200 }, { id: 201 }],
        creators: [{ id: 300 }],
      },
    )
  })

  it('keeps unavailable metadata unavailable instead of converting it to empty available fields', () => {
    const metadata = completeMetadata({
      genres: [],
      releaseYear: null,
      originalLanguage: null,
      countries: [],
      directors: [],
      actors: [],
      completeness: {
        genres: false,
        releaseYear: false,
        originalLanguage: false,
        countries: false,
        people: false,
      },
    })

    assert.deepEqual(
      recommendationMetadataFromResolved(metadata, 'movie'),
      {},
    )
  })

  it('prepares a resolved candidate for rankRecommendations', () => {
    const prepared = prepareRecommendationCandidate({
      mediaKey: 'movie_550',
      tmdbId: 550,
      mediaType: 'movie',
      title: 'Fight Club',
      popularity: 50,
      metadata: completeMetadata(),
    })

    assert.deepEqual(prepared, {
      mediaKey: 'movie_550',
      tmdbId: 550,
      mediaType: 'movie',
      title: 'Fight Club',
      popularity: 50,
      metadata: {
        genreIds: [28],
        releaseYear: 2014,
        originalLanguage: 'en',
        countryCodes: ['US'],
        actors: [{ id: 200 }, { id: 201 }],
        directors: [{ id: 100 }],
      },
    })
  })

  it('rejects malformed identities and malformed resolved metadata safely', () => {
    assert.equal(
      prepareRecommendationCandidate({
        mediaKey: 'movie_2',
        tmdbId: 1,
        mediaType: 'movie',
        metadata: completeMetadata(),
      }),
      null,
    )

    assert.equal(
      recommendationMetadataFromResolved({
        ...completeMetadata(),
        originalLanguage: { code: 'english' },
      }, 'movie'),
      null,
    )
  })
})
