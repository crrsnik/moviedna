import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, before, describe, it } from 'node:test'

import { createFirestoreAdapter } from '../../functions/src/adapters/firestoreAdapter.js'
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
  },
)
