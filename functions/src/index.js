import { getApps, initializeApp } from 'firebase-admin/app'
import { getAppCheck } from 'firebase-admin/app-check'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { onCall, onRequest } from 'firebase-functions/v2/https'

import { createFirestoreAdapter } from './adapters/firestoreAdapter.js'
import {
  createDeleteAccountHandler,
} from './accountDeletion/deleteAccountHandler.js'
import {
  createFirestoreAccountDeletionStore,
} from './accountDeletion/firestoreAccountDeletionStore.js'
import {
  createUserEventGuard,
} from './accountDeletion/userEventGuard.js'
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
import { createFirestorePublicProfilePreviewStore } from './profilePreview/firestorePublicProfilePreviewStore.js'
import { createPublicProfilePreviewHandlers } from './profilePreview/publicProfilePreview.js'
import { createFirestorePublicBoardStore } from './publicBoards/firestorePublicBoardStore.js'
import { createPublicBoardHandlers } from './publicBoards/publicBoards.js'
import { createRecommendationHandler } from './recommendations/createRecommendationHandler.js'
import { createRecommendationPipeline } from './recommendations/recommendationPipeline.js'
import { createRecommendationTmdbClient } from './recommendations/tmdb/recommendationTmdbClient.js'
import { createRecalculationRunner } from './runner/recalculationRunner.js'

if (!getApps().length) initializeApp()

const tmdbToken = defineSecret('TMDB_READ_ACCESS_TOKEN')

function createRuntimeFetch() {
  if (process.env.FUNCTIONS_EMULATOR !== 'true') return globalThis.fetch

  try {
    const token = tmdbToken.value()
    if (typeof token === 'string' && token.trim()) return globalThis.fetch
  } catch {}

  return async () => {
    throw new MovieDnaServerError(SERVER_ERROR_CODES.TMDB_UNAVAILABLE)
  }
}

function createDeleteAccountRuntimeHandler() {
  const db = getFirestore()

  const store = (
    createFirestoreAccountDeletionStore(db)
  )

  return createDeleteAccountHandler({
    deleteUserData: uid => (
      store.deleteUserData(uid)
    ),

    deleteAuthUser: async uid => {
      await getAuth().deleteUser(uid)
    },
  })
}

async function runForActiveUser(
  event,
  operation,
) {
  return createUserEventGuard(
    getFirestore(),
  )(
    event,
    operation,
  )
}

function createRuntimeHandlers() {
  const store = createFirestoreAdapter(getFirestore())
  const fetchImpl = createRuntimeFetch()
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

  const fetchImpl = createRuntimeFetch()

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
    requireAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true',
  })
}

const triggerOptions = { ...RUNTIME_OPTIONS, retry: false, secrets: [tmdbToken] }
const profilePreviewTriggerOptions = { ...RUNTIME_OPTIONS, retry: false }

function createPublicProfilePreviewRuntimeHandlers() {
  const store = createFirestorePublicProfilePreviewStore(getFirestore())
  return createPublicProfilePreviewHandlers(store)
}

function createPublicBoardRuntimeHandlers() {
  const store = createFirestorePublicBoardStore(getFirestore())
  return createPublicBoardHandlers(store)
}

export const onRatingWritten = onDocumentWritten({
  ...triggerOptions,
  document: 'users/{uid}/ratings/{mediaKey}',
}, event => runForActiveUser(
  event,
  () => createRuntimeHandlers().sourceWrite(event),
))

export const onOnboardingSummaryWritten = onDocumentWritten({
  ...triggerOptions,
  document: 'users/{uid}/onboarding/summary',
}, event => runForActiveUser(
  event,
  () => createRuntimeHandlers().sourceWrite(event),
))

export const onSavedMediaWritten = onDocumentWritten({
  ...triggerOptions,
  document: 'users/{uid}/savedMedia/{mediaKey}',
}, event => runForActiveUser(
  event,
  async () => {
    const [
      movieDna,
      publicBoards,
    ] = await Promise.all([
      createRuntimeHandlers().savedMediaWrite(event),
      createPublicBoardRuntimeHandlers()
        .savedMediaWrite(event),
    ])

    return {
      movieDna,
      publicBoards,
    }
  },
))

export const onCustomListWritten = onDocumentWritten({
  ...profilePreviewTriggerOptions,
  document: 'users/{uid}/lists/{listId}',
}, event => runForActiveUser(
  event,
  () => (
    createPublicBoardRuntimeHandlers()
      .customListWrite(event)
  ),
))

export const onMovieDnaCurrentWritten = onDocumentWritten({
  ...profilePreviewTriggerOptions,
  document: 'users/{uid}/movieDna/current',
}, event => runForActiveUser(
  event,
  () => (
    createPublicProfilePreviewRuntimeHandlers()
      .movieDnaWrite(event)
  ),
))

export const onViewingHistoryWritten = onDocumentWritten({
  ...profilePreviewTriggerOptions,
  document: 'users/{uid}/viewingHistory/{eventId}',
}, event => runForActiveUser(
  event,
  () => (
    createPublicProfilePreviewRuntimeHandlers()
      .viewingHistoryWrite(event)
  ),
))

export const onPublicProfileWritten = onDocumentWritten({
  ...profilePreviewTriggerOptions,
  document: 'publicProfiles/{uid}',
}, event => runForActiveUser(
  event,
  () => (
    createPublicProfilePreviewRuntimeHandlers()
      .publicProfileWrite(event)
  ),
))

export const deleteAccount = onCall({
  ...RUNTIME_OPTIONS,
  enforceAppCheck:
    process.env.FUNCTIONS_EMULATOR !== 'true',
}, request => (
  createDeleteAccountRuntimeHandler()(request)
))

export const refreshMovieDna = onCall({
  ...REFRESH_MOVIE_DNA_OPTIONS,
  secrets: [tmdbToken],
}, (request) => createRuntimeHandlers().manualRefresh(request))

export const getRecommendations = onCall({
  ...RECOMMENDATION_OPTIONS,
  enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true',
  secrets: [tmdbToken],
}, (request) => createRecommendationRuntimeHandler()(request))

export const tmdbProxy = onRequest({
  ...TMDB_PROXY_OPTIONS,
  secrets: [tmdbToken],
}, createTmdbProxyHandler({
  verifyAppCheck: async (token) => {
    const result = await getAppCheck().verifyToken(token)
    return result.token
  },
  getSecret: () => tmdbToken.value(),
  maxResponseBytes: TMDB_PROXY_MAX_RESPONSE_BYTES,
  timeoutMs: TMDB_PROXY_TIMEOUT_MS,
}))
