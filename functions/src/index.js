import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { onCall } from 'firebase-functions/v2/https'

import { createFirestoreAdapter } from './adapters/firestoreAdapter.js'
import { RUNTIME_OPTIONS } from './config.js'
import { MovieDnaServerError, SERVER_ERROR_CODES } from './errors.js'
import { createHandlers } from './handlers/createHandlers.js'
import { createMetadataResolver } from './metadata/metadataCache.js'
import { createTmdbClient } from './metadata/tmdbClient.js'
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
  ...RUNTIME_OPTIONS,
  enforceAppCheck: false,
  secrets: [tmdbToken],
}, (request) => createRuntimeHandlers().manualRefresh(request))
