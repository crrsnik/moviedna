import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, before, describe, it } from 'node:test'

import { createFirestoreAdapter } from '../../functions/src/adapters/firestoreAdapter.js'
import { calculateMovieDna } from '../../functions/src/dna/core/calculateMovieDna.js'
import { createRecommendationHandler } from '../../functions/src/recommendations/createRecommendationHandler.js'
import { createRecommendationPipeline } from '../../functions/src/recommendations/recommendationPipeline.js'
import { normalizeRecommendationsResponse } from '../../src/features/recommendations/services/normalizeRecommendations.js'

const projectId = 'demo-moviedna'

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST

if (
  !['127.0.0.1:8080', 'localhost:8080'].includes(
    emulatorHost,
  )
) {
  throw new Error(
    'Run this test only with the local Firestore Emulator.',
  )
}

const requireFromFunctions = createRequire(
  new URL(
    '../../functions/package.json',
    import.meta.url,
  ),
)

const {
  deleteApp,
  initializeApp,
} = requireFromFunctions('firebase-admin/app')

const {
  getFirestore,
} = requireFromFunctions('firebase-admin/firestore')

let adminApp
let db

function dna() {
  return {
    schemaVersion: 1,
    algorithmVersion: '1.0.0',
    status: 'ready',

    dimensions: {
      genres: [{
        key: 'genre:28',
        label: 'Action',
        score: 1,
        confidence: 1,
      }],

      mediaTypes: [{
        key: 'media:movie',
        label: 'movie',
        score: 0.8,
        confidence: 1,
      }, {
        key: 'media:tv',
        label: 'tv',
        score: 0.4,
        confidence: 1,
      }],

      decades: [],
      languages: [],
      countries: [],
      directors: [],
      creators: [],
      actors: [],
    },
  }
}

function movie(id, title) {
  return {
    id,
    title,
    popularity: 100 - id / 1000,
    poster_path: `/movie-${id}.jpg`,
    release_date: '2024-02-20',
    vote_average: 8.1,
    vote_count: 1000,
  }
}

function tv(id, name) {
  return {
    id,
    name,
    popularity: 90,
    poster_path: `/tv-${id}.jpg`,
    first_air_date: '2024-03-10',
    vote_average: 7.8,
    vote_count: 800,
  }
}

function source(mediaType) {
  return {
    source: 'synthetic-integration',
    mediaType,

    results: mediaType === 'movie'
      ? [
          movie(101, 'Already rated'),
          movie(201, 'Fresh recommendation'),
        ]
      : [
          tv(301, 'Synthetic series'),
        ],
  }
}

function metadataFor(candidate) {
  return {
    status: 'ready',

    genres: [{
      id: 28,
      label: 'Action',
    }],

    releaseYear: 2024,

    originalLanguage: {
      code: 'en',
      label: 'English',
    },

    countries: [{
      code: 'US',
      label: 'United States',
    }],

    directors: candidate.mediaType === 'movie'
      ? [{
          id: 9001,
          name: 'Synthetic Director',
        }]
      : [],

    creators: candidate.mediaType === 'tv'
      ? [{
          id: 9002,
          name: 'Synthetic Creator',
        }]
      : [],

    actors: [{
      id: 9003,
      name: 'Synthetic Actor',
      billingOrder: 0,
    }],

    completeness: {
      genres: true,
      releaseYear: true,
      originalLanguage: true,
      countries: true,
      people: true,
    },
  }
}

function tasteEvidenceItem(
  id,
  {
    rating = null,
    onboardingReaction = null,
    keyword,
  },
) {
  return {
    mediaKey: `movie_${id}`,
    tmdbId: id,
    mediaType: 'movie',
    rating,
    onboardingReaction,
    favorite: false,

    metadata: {
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

      keywords: [
        {
          id: id * 100,
          name: keyword,
        },
      ],

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

      directors: [],
      creators: [],
      actors: [],

      completeness: {
        genres: true,
        releaseYear: true,
        originalLanguage: true,
        countries: true,
        people: true,
      },
    },
  }
}

async function psychologicalTasteDna(
  direction,
) {
  const positive = direction === 'positive'

  const items = positive
    ? [
        tasteEvidenceItem(
          7101,
          {
            rating: 10,
            keyword: 'psychology',
          },
        ),
        tasteEvidenceItem(
          7102,
          {
            rating: 9,
            keyword: 'paranoia',
          },
        ),
        tasteEvidenceItem(
          7103,
          {
            onboardingReaction: 'like',
            keyword: 'obsession',
          },
        ),
      ]
    : [
        tasteEvidenceItem(
          7201,
          {
            rating: 1,
            keyword: 'psychology',
          },
        ),
        tasteEvidenceItem(
          7202,
          {
            rating: 2,
            keyword: 'paranoia',
          },
        ),
        tasteEvidenceItem(
          7203,
          {
            onboardingReaction: 'dislike',
            keyword: 'obsession',
          },
        ),
      ]

  return calculateMovieDna({
    items,
  })
}

function tasteDiscoveryCandidate(
  id,
  title,
) {
  return {
    id,
    title,
    popularity: 40,
    poster_path: `/taste-${id}.jpg`,
    release_date: '2024-01-15',
    vote_average: 7.5,
    vote_count: 2000,
  }
}

function tasteSource(mediaType) {
  return {
    source: 'taste-intelligence-integration',
    mediaType,

    results: mediaType === 'movie'
      ? [
          tasteDiscoveryCandidate(
            7501,
            'Psychological Candidate',
          ),
          tasteDiscoveryCandidate(
            7502,
            'Generic Thriller',
          ),
        ]
      : [],
  }
}

function tasteMetadataFor(candidate) {
  const psychological =
    candidate.tmdbId === 7501

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

    keywords: psychological
      ? [
          {
            id: 88001,
            name: 'psychology',
          },
          {
            id: 88002,
            name: 'paranoia',
          },
        ]
      : [],

    releaseYear: 2024,

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
        id: 99001,
        name: 'Same Director',
      },
    ],

    creators: [],

    actors: [
      {
        id: 99002,
        name: 'Same Actor',
        billingOrder: 0,
      },
    ],

    completeness: {
      genres: true,
      releaseYear: true,
      originalLanguage: true,
      countries: true,
      people: true,
    },
  }
}

function tasteSourceClient() {
  return {
    async getTrending(mediaType) {
      return tasteSource(mediaType)
    },

    async getPopular(mediaType) {
      return tasteSource(mediaType)
    },

    async getTopRated(mediaType) {
      return tasteSource(mediaType)
    },

    async getRecommendations(
      mediaType,
    ) {
      return tasteSource(mediaType)
    },

    async discoverByGenre(
      mediaType,
    ) {
      return tasteSource(mediaType)
    },
  }
}

function tasteMetadataResolver() {
  return {
    async resolve(candidates) {
      return candidates.map(
        candidate => ({
          ...candidate,
          metadata:
            tasteMetadataFor(candidate),
        }),
      )
    },
  }
}

async function runTasteRecommendationFlow(
  direction,
) {
  const calculatedDna =
    await psychologicalTasteDna(direction)

  const pipeline =
    createRecommendationPipeline({
      sourceClient: tasteSourceClient(),
      metadataResolver:
        tasteMetadataResolver(),
      maxPerMediaType: 10,
    })

  const recommendation =
    await pipeline.run({
      dna: calculatedDna,
      rated: [],
      seedSignals: [],
      watched: [],
      hidden: [],
    })

  return {
    dna: calculatedDna,
    recommendation,
  }
}

describe(
  'recommendation Firestore-to-client integration',
  { concurrency: false },
  () => {
    before(async () => {
      adminApp = initializeApp(
        { projectId },
        'recommendation-integration',
      )

      db = getFirestore(adminApp)
    })

    after(async () => {
      if (adminApp) {
        await deleteApp(adminApp)
      }
    })

    it('loads private context, excludes known media before enrichment, ranks candidates and produces a client-safe response', async () => {
      const uid = 'recommendation-integration-user'

      const user = db
        .collection('users')
        .doc(uid)

      await user.set({
        username: 'recommendation_user',
      })

      await user
        .collection('movieDna')
        .doc('current')
        .set(dna())

      await user
        .collection('ratings')
        .doc('movie_101')
        .set({
          tmdbId: 101,
          mediaType: 'movie',
          score: 10,
        })

      // Legacy onboarding opinion: must still count as watched even if
      // savedMedia was created before the watched migration.
      await user
        .collection('onboardingResponses')
        .doc('201')
        .set({
          tmdbId: 201,
          mediaType: 'movie',
          reaction: 'like',
        })

      await user
        .collection('savedMedia')
        .doc('movie_202')
        .set({
          tmdbId: 202,
          mediaType: 'movie',
          watched: true,
        })

      await user
        .collection('viewingHistory')
        .doc('AbCdEf0123456789GhIj')
        .set({
          tmdbId: 203,
          mediaType: 'movie',
        })

      const store = createFirestoreAdapter(db)

      const sourceClient = {
        async getTrending(mediaType) {
          return source(mediaType)
        },

        async getPopular(mediaType) {
          return source(mediaType)
        },

        async getTopRated(mediaType) {
          return source(mediaType)
        },

        async getRecommendations(
          mediaType,
          tmdbId,
          page = 1,
        ) {
          const value = source(mediaType)

          return {
            ...value,
            source:
              `seed:${mediaType}_${tmdbId}:${page}`,
          }
        },

        async discoverByGenre(mediaType) {
          return source(mediaType)
        },
      }

      const resolvedMediaKeys = []

      const metadataResolver = {
        async resolve(candidates) {
          resolvedMediaKeys.push(
            ...candidates.map(
              candidate => candidate.mediaKey,
            ),
          )

          return candidates.map(candidate => ({
            ...candidate,
            metadata: metadataFor(candidate),
          }))
        },
      }

      const pipeline = createRecommendationPipeline({
        sourceClient,
        metadataResolver,
        maxPerMediaType: 10,
      })

      const handler = createRecommendationHandler({
        loadContext: uidValue =>
          store.loadRecommendationContext(
            uidValue,
          ),
        pipeline,
      })

      const context =
        await store.loadRecommendationContext(uid)

      assert.ok(
        context.dna,
        'Firestore adapter must load MovieDNA.',
      )

      assert.deepEqual(
        context.rated,
        [{
          tmdbId: 101,
          mediaType: 'movie',
          rating: 10,
        }],
      )

      assert.deepEqual(
        context.watched,
        [
          {
            tmdbId: 201,
            mediaType: 'movie',
          },
          {
            tmdbId: 202,
            mediaType: 'movie',
          },
          {
            tmdbId: 203,
            mediaType: 'movie',
          },
        ],
      )

      const raw = await handler({
        auth: { uid },
        app: {
          appId: 'synthetic-app-check',
        },
      })

      const client =
        normalizeRecommendationsResponse(raw)

      assert.deepEqual(
        resolvedMediaKeys,
        [
          'tv_301',
        ],
      )

      assert.equal(
        resolvedMediaKeys.includes('movie_101'),
        false,
      )

      assert.equal(
        resolvedMediaKeys.includes('movie_201'),
        false,
      )

      assert.deepEqual(
        client.results.map(
          item => item.mediaKey,
        ),
        [
          'tv_301',
        ],
      )

      assert.equal(
        client.results[0].posterPath,
        '/tv-301.jpg',
      )

      assert.equal(
        client.results[0].releaseDate,
        '2024-03-10',
      )

      assert.ok(
        client.results[0].score > 50,
      )

      assert.ok(
        client.results[0].reasons.length >= 1,
      )
    })

    it(
      'carries positive psychological-thriller taste from ratings and onboarding into recommendation ranking',
      async () => {
        const {
          dna: calculatedDna,
          recommendation,
        } =
          await runTasteRecommendationFlow(
            'positive',
          )

        const psychologicalTaste =
          calculatedDna.dimensions.tasteTags.find(
            entry => (
              entry.key
              === 'taste:psychological-thriller'
            ),
          )

        assert.ok(
          psychologicalTaste,
          'DNA should infer Psychological Thriller.',
        )

        assert.ok(
          psychologicalTaste.strength > 0.9,
          'Repeated positive evidence should create a strong taste.',
        )

        const psychological =
          recommendation.results.find(
            result => (
              result.mediaKey
              === 'movie_7501'
            ),
          )

        const generic =
          recommendation.results.find(
            result => (
              result.mediaKey
              === 'movie_7502'
            ),
          )

        assert.ok(psychological)
        assert.ok(generic)

        assert.ok(
          psychological.tasteMatch > 0,
        )

        assert.ok(
          psychological.tasteAdjustment > 0,
        )

        assert.equal(
          generic.tasteAdjustment,
          0,
        )

        assert.ok(
          psychological.score
          > generic.score,
        )

        assert.equal(
          recommendation.results[0].mediaKey,
          'movie_7501',
        )
      },
    )

    it(
      'carries negative psychological-thriller taste into recommendation ranking',
      async () => {
        const {
          dna: calculatedDna,
          recommendation,
        } =
          await runTasteRecommendationFlow(
            'negative',
          )

        const psychologicalTaste =
          calculatedDna.dimensions.tasteTags.find(
            entry => (
              entry.key
              === 'taste:psychological-thriller'
            ),
          )

        assert.ok(
          psychologicalTaste,
          'DNA should preserve negative Psychological Thriller evidence.',
        )

        assert.ok(
          psychologicalTaste.strength < -0.9,
          'Repeated negative evidence should create a strong negative taste.',
        )

        const psychological =
          recommendation.results.find(
            result => (
              result.mediaKey
              === 'movie_7501'
            ),
          )

        const generic =
          recommendation.results.find(
            result => (
              result.mediaKey
              === 'movie_7502'
            ),
          )

        assert.ok(psychological)
        assert.ok(generic)

        assert.ok(
          psychological.tasteMatch < 0,
        )

        assert.ok(
          psychological.tasteAdjustment < 0,
        )

        assert.equal(
          generic.tasteAdjustment,
          0,
        )

        assert.ok(
          psychological.score
          < generic.score,
        )

        assert.equal(
          recommendation.results[0].mediaKey,
          'movie_7502',
        )
      },
    )
  },
)
