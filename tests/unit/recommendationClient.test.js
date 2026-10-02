import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeRecommendationsResponse,
  RecommendationClientError,
} from '../../src/features/recommendations/services/normalizeRecommendations.js'
import {
  createRecommendationService,
} from '../../src/features/recommendations/services/createRecommendationService.js'
import {
  deriveRecommendationState,
} from '../../src/features/recommendations/hooks/recommendationState.js'

function result(overrides = {}) {
  return {
    mediaKey: 'movie_550',
    tmdbId: 550,
    mediaType: 'movie',
    title: 'Fight Club',
    posterPath: '/fight-club.jpg',
    releaseDate: '1999-10-15',
    voteAverage: 8.4,
    voteCount: 25000,
    score: 91.25,
    metadataCoverage: 1,
    profileEvidenceCoverage: 0.8,
    hasPersonalizationEvidence: true,
    reasons: [
      'Strong genre fit.',
      'Strong director fit.',
    ],
    popularity: 50,
    ...overrides,
  }
}

function response(overrides = {}) {
  return {
    algorithmVersion: '1.0.0',
    genreIds: [18, 35],
    results: [result()],
    stats: {
      privateServerDiagnostic: true,
    },
    ...overrides,
  }
}

describe('recommendation response normalization', () => {
  it('normalizes a UI-ready result and strips unknown server fields', () => {
    const normalized = normalizeRecommendationsResponse(
      response(),
    )

    assert.deepEqual(normalized, {
      algorithmVersion: '1.0.0',
      genreIds: [18, 35],
      results: [{
        id: 550,
        mediaKey: 'movie_550',
        tmdbId: 550,
        mediaType: 'movie',
        title: 'Fight Club',
        posterPath: '/fight-club.jpg',
        releaseDate: '1999-10-15',
        voteAverage: 8.4,
        voteCount: 25000,
        score: 91.25,
        metadataCoverage: 1,
        profileEvidenceCoverage: 0.8,
        hasPersonalizationEvidence: true,
        reasons: [
          'Strong genre fit.',
          'Strong director fit.',
        ],
        popularity: 50,
      }],
    })

    assert.equal(
      'stats' in normalized,
      false,
    )
  })

  it('supports TV and nullable optional display fields', () => {
    const normalized = normalizeRecommendationsResponse(
      response({
        genreIds: [],
        results: [result({
          mediaKey: 'tv_1399',
          tmdbId: 1399,
          mediaType: 'tv',
          title: 'Game of Thrones',
          posterPath: null,
          releaseDate: null,
          voteAverage: null,
          voteCount: 0,
        })],
      }),
    )

    assert.equal(normalized.results[0].id, 1399)
    assert.equal(normalized.results[0].posterPath, null)
    assert.equal(normalized.results[0].mediaType, 'tv')
  })

  it('rejects unsupported algorithm versions safely', () => {
    assert.throws(
      () => normalizeRecommendationsResponse(
        response({
          algorithmVersion: '2.0.0',
        }),
      ),
      error => (
        error instanceof RecommendationClientError
        && error.code === 'unsupported-version'
      ),
    )
  })

  it('rejects duplicate and inconsistent media identities', () => {
    assert.throws(
      () => normalizeRecommendationsResponse(
        response({
          results: [result(), result()],
        }),
      ),
      { code: 'malformed' },
    )

    assert.throws(
      () => normalizeRecommendationsResponse(
        response({
          results: [result({
            mediaKey: 'tv_550',
          })],
        }),
      ),
      { code: 'malformed' },
    )
  })

  it('rejects unsafe display and ranking fields', () => {
    for (const overrides of [
      {
        posterPath:
          'https://example.invalid/poster.jpg',
      },
      { releaseDate: '2023-02-29' },
      { voteAverage: 11 },
      { voteCount: -1 },
      { score: 101 },
      { metadataCoverage: 2 },
      { profileEvidenceCoverage: -1 },
      { reasons: [] },
      { reasons: [''] },
    ]) {
      assert.throws(
        () => normalizeRecommendationsResponse(
          response({
            results: [result(overrides)],
          }),
        ),
        { code: 'malformed' },
      )
    }
  })
})

describe('recommendation callable service', () => {
  it('calls the server without trusting a client UID', async () => {
    const calls = []

    const service = createRecommendationService({
      callRecommendations: async (...args) => {
        calls.push(args)
        return { data: response() }
      },
    })

    const value = await service.getRecommendations()

    assert.equal(value.results.length, 1)
    assert.deepEqual(calls, [['en-US']])
  })

  it('preserves safe Firebase callable codes without leaking raw messages', async () => {
    const service = createRecommendationService({
      callRecommendations: async () => {
        const error = new Error(
          'PRIVATE_SERVER_DETAILS',
        )
        error.code = 'functions/unavailable'
        throw error
      },
    })

    await assert.rejects(
      service.getRecommendations(),
      error => (
        error instanceof RecommendationClientError
        && error.code === 'unavailable'
        && !error.message.includes('PRIVATE')
      ),
    )
  })

  it('rejects malformed dependencies', () => {
    assert.throws(
      () => createRecommendationService(),
      TypeError,
    )
  })
})

describe('recommendation UI state', () => {
  it('derives idle, loading, empty and ready states', () => {
    assert.equal(
      deriveRecommendationState().kind,
      'idle',
    )

    assert.equal(
      deriveRecommendationState({
        loading: true,
      }).kind,
      'loading',
    )

    assert.equal(
      deriveRecommendationState({
        data: {
          algorithmVersion: '1.0.0',
          genreIds: [],
          results: [],
        },
      }).kind,
      'empty',
    )

    assert.equal(
      deriveRecommendationState({
        data: {
          algorithmVersion: '1.0.0',
          genreIds: [],
          results: [result()],
        },
      }).kind,
      'ready',
    )
  })

  it('distinguishes DNA-unavailable from generic failures', () => {
    assert.equal(
      deriveRecommendationState({
        error: new RecommendationClientError(
          'failed-precondition',
        ),
      }).kind,
      'unavailable',
    )

    assert.equal(
      deriveRecommendationState({
        error: new RecommendationClientError(
          'unavailable',
        ),
      }).kind,
      'error',
    )
  })
})

describe('recommendation unavailable state', () => {
  it('maps an unavailable DNA lifecycle without a callable error', () => {
    assert.deepEqual(
      deriveRecommendationState({
        unavailable: true,
      }),
      {
        kind: 'unavailable',
        results: [],
        data: null,
        error: null,
      },
    )
  })

  it('keeps loading precedence while DNA or recommendations are pending', () => {
    assert.equal(
      deriveRecommendationState({
        loading: true,
        unavailable: true,
      }).kind,
      'loading',
    )
  })
})
