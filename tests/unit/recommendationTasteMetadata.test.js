import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  prepareRecommendationCandidate,
  recommendationMetadataFromResolved,
} from '../../functions/src/recommendations/core/prepareRecommendationCandidates.js'

const complete = {
  genres: true,
  releaseYear: true,
  originalLanguage: true,
  countries: true,
  people: true,
}

function metadata(overrides = {}) {
  return {
    status: 'ready',
    genres: [
      {
        id: 18,
        label: 'Drama',
      },
      {
        id: 53,
        label: 'Thriller',
      },
    ],
    keywords: [],
    releaseYear: 2020,
    originalLanguage: {
      code: 'en',
      label: 'English',
    },
    countries: [
      {
        code: 'US',
        label: 'United States',
      },
    ],
    directors: [
      {
        id: 100,
        name: 'Director',
      },
    ],
    creators: [],
    actors: [
      {
        id: 200,
        name: 'Actor',
        billingOrder: 0,
      },
    ],
    completeness: {
      ...complete,
    },
    ...overrides,
  }
}

describe(
  'recommendation candidate taste metadata',
  () => {
    it(
      'infers psychological thriller for recommendation candidates',
      () => {
        const result =
          recommendationMetadataFromResolved(
            metadata({
              keywords: [
                {
                  id: 1,
                  name: 'Psychology',
                },
                {
                  id: 2,
                  name: 'Paranoia',
                },
              ],
            }),
            'movie',
          )

        assert.ok(result)

        assert.ok(
          result.tasteTags.some(
            taste => (
              taste.key
              === 'taste:psychological-thriller'
            ),
          ),
        )
      },
    )

    it(
      'does not infer psychological thriller from genres alone',
      () => {
        const result =
          recommendationMetadataFromResolved(
            metadata({
              keywords: [],
            }),
            'movie',
          )

        assert.ok(result)

        assert.equal(
          result.tasteTags.some(
            taste => (
              taste.key
              === 'taste:psychological-thriller'
            ),
          ),
          false,
        )
      },
    )

    it(
      'uses the same Russian romantic TV taxonomy as MovieDNA',
      () => {
        const result =
          recommendationMetadataFromResolved(
            metadata({
              genres: [
                {
                  id: 18,
                  label: 'Drama',
                },
                {
                  id: 10749,
                  label: 'Romance',
                },
              ],
              keywords: [
                {
                  id: 10,
                  name: 'Falling in Love',
                },
              ],
              originalLanguage: {
                code: 'ru',
                label: 'Russian',
              },
              countries: [
                {
                  code: 'RU',
                  label: 'Russia',
                },
              ],
              directors: [],
              creators: [
                {
                  id: 300,
                  name: 'Creator',
                },
              ],
            }),
            'tv',
          )

        assert.ok(result)

        assert.ok(
          result.tasteTags.some(
            taste => (
              taste.key
              === 'taste:russian-romantic-tv'
            ),
          ),
        )
      },
    )

    it(
      'keeps old metadata without keywords backward compatible',
      () => {
        const oldMetadata = metadata()

        delete oldMetadata.keywords

        const result =
          recommendationMetadataFromResolved(
            oldMetadata,
            'movie',
          )

        assert.ok(result)
        assert.deepEqual(
          result.tasteTags,
          [],
        )
      },
    )

    it(
      'rejects malformed keyword metadata safely',
      () => {
        const malformed =
          recommendationMetadataFromResolved(
            metadata({
              keywords: [
                {
                  id: 1,
                  name: '',
                },
              ],
            }),
            'movie',
          )

        assert.equal(
          malformed,
          null,
        )
      },
    )

    it(
      'preserves inferred taste tags on prepared candidates',
      () => {
        const candidate =
          prepareRecommendationCandidate({
            mediaKey: 'movie_500',
            tmdbId: 500,
            mediaType: 'movie',
            title: 'Synthetic Thriller',
            popularity: 10,
            voteAverage: 8,
            voteCount: 1000,
            metadata: metadata({
              keywords: [
                {
                  id: 20,
                  name: 'Obsession',
                },
              ],
            }),
          })

        assert.ok(candidate)

        assert.ok(
          candidate.metadata.tasteTags.some(
            taste => (
              taste.key
              === 'taste:psychological-thriller'
            ),
          ),
        )
      },
    )
  },
)
