import { getApps, initializeApp } from 'firebase-admin/app'
import { getAppCheck } from 'firebase-admin/app-check'
import { getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { onCall, onRequest } from 'firebase-functions/v2/https'

import { createFirestoreAdapter } from './adapters/firestoreAdapter.js'
import {
  RECOMMENDATION_OPTIONS,
  REFRESH_MOVIE_DNA_OPTIONS,
  RUNTIME_OPTIONS,
  TMDB_PROXY_MAX_RESPONSE_BYTES,
  TMDB_PROXY_OPTIONS,
  TMDB_PROXY_TIMEOUT_MS,
} from './config.js'
import { MovieDnaServerError, SERVER_ERROR_CODES } from './errors.js'
import { createHandlers } from './handlers/createHandlers.js'
import { createMetadataResolver } from './metadata/metadataCache.js'
import { createTmdbClient } from './metadata/tmdbClient.js'
import { createTmdbProxyHandler } from './proxy/createTmdbProxyHandler.js'
import { createRecommendationHandler } from './recommendations/createRecommendationHandler.js'
import { createRecommendationPipeline } from './recommendations/recommendationPipeline.js'
import { createRecommendationTmdbClient } from './recommendations/tmdb/recommendationTmdbClient.js'
import { createRecalculationRunner } from './runner/recalculationRunner.js'

if (!getApps().length) initializeApp()

const tmdbToken = defineSecret('TMDB_READ_ACCESS_TOKEN')

function createRuntimeHandlers() {
  const store = createFirestoreAdapter(getFirestore())
  const fetchImpl = process.env.FUNCTIONS_EMULATOR === 'true'
    ? async () => { throw new MovieDnaServerError(SERVER_ERROR_CODES.TMDB_UNAVAILABLE) }
    : globalThis.fetch
  const tmdbClient = {
    getMetadata(mediaType, tmdbId) {
      return createTmdbClient({ token: tmdbToken.value(), fetchImpl }).getMetadata(mediaType, tmdbId)
    },
  }
  const metadataResolver = createMetadataResolver({ cache: store.cache, tmdbClient })
  return createHandlers(createRecalculationRunner({ store, metadataResolver }))
}

function createRecommendationRuntimeHandler() {
  const store = createFirestoreAdapter(getFirestore())

  const fetchImpl = process.env.FUNCTIONS_EMULATOR === 'true'
    ? async () => { throw new MovieDnaServerError(SERVER_ERROR_CODES.TMDB_UNAVAILABLE) }
    : globalThis.fetch

  const metadataClient = {
    getMetadata(mediaType, tmdbId) {
      return createTmdbClient({
        token: tmdbToken.value(),
        fetchImpl,
      }).getMetadata(mediaType, tmdbId)
    },
  }

  const metadataResolver = createMetadataResolver({
    cache: store.cache,
    tmdbClient: metadataClient,
  })

  const sourceClient = createRecommendationTmdbClient({
    token: tmdbToken.value(),
    fetchImpl,
  })

  const pipeline = createRecommendationPipeline({
    sourceClient,
    metadataResolver,
    maxPerMediaType: 40,
  })

  return createRecommendationHandler({
    loadContext: (uid) => store.loadRecommendationContext(uid),
    pipeline,
  })
}

const triggerOptions = { ...RUNTIME_OPTIONS, retry: false, secrets: [tmdbToken] }

export const onRatingWritten = onDocumentWritten({
  ...triggerOptions,
  document: 'users/{uid}/ratings/{mediaKey}',
}, (event) => createRuntimeHandlers().sourceWrite(event))

export const onOnboardingSummaryWritten = onDocumentWritten({
  ...triggerOptions,
  document: 'users/{uid}/onboarding/summary',
}, (event) => createRuntimeHandlers().sourceWrite(event))

export const onSavedMediaWritten = onDocumentWritten({
  ...triggerOptions,
  document: 'users/{uid}/savedMedia/{mediaKey}',
}, (event) => createRuntimeHandlers().savedMediaWrite(event))

export const refreshMovieDna = onCall({
  ...REFRESH_MOVIE_DNA_OPTIONS,
  secrets: [tmdbToken],
}, (request) => createRuntimeHandlers().manualRefresh(request))

export const getRecommendations = onCall({
  ...RECOMMENDATION_OPTIONS,
  secrets: [tmdbToken],
}, (request) => createRecommendationRuntimeHandler()(request))

export const tmdbProxy = onRequest({
  ...TMDB_PROXY_OPTIONS,
  secrets: [tmdbToken],
}, createTmdbProxyHandler({
  verifyAppCheck: (token) => getAppCheck().verifyToken(token),
  getSecret: () => tmdbToken.value(),
  maxResponseBytes: TMDB_PROXY_MAX_RESPONSE_BYTES,
  timeoutMs: TMDB_PROXY_TIMEOUT_MS,
}))
