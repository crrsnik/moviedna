import { HttpsError } from 'firebase-functions/v2/https'

import { MovieDnaServerError, SERVER_ERROR_CODES } from '../errors.js'

function safeCallableError(error) {
  if (error instanceof MovieDnaServerError) {
    const code = error.code === SERVER_ERROR_CODES.UNAUTHENTICATED ? 'unauthenticated'
      : error.code === SERVER_ERROR_CODES.COOLDOWN ? 'resource-exhausted'
        : error.code === SERVER_ERROR_CODES.ONBOARDING_REQUIRED ? 'failed-precondition'
          : error.code === SERVER_ERROR_CODES.APP_CHECK_REQUIRED ? 'failed-precondition'
          : 'internal'
    return new HttpsError(code, error.message)
  }
  return new HttpsError('internal', 'MovieDNA could not be refreshed.')
}

export function createHandlers(recalculate) {
  const sourceWrite = async (event) => recalculate(event.params.uid)
  const savedMediaWrite = async (event) => {
    const before = event.data?.before?.data?.() ?? null
    const after = event.data?.after?.data?.() ?? null
    const dnaFields = (value) => value?.favorite === true ? ({
      favorite: true,
      tmdbId: value.tmdbId,
      mediaType: value.mediaType,
    }) : null
    if (JSON.stringify(dnaFields(before)) === JSON.stringify(dnaFields(after))) {
      return { status: 'unchanged' }
    }
    return recalculate(event.params.uid)
  }
  const manualRefresh = async (request) => {
    if (!request.auth?.uid) {
      throw safeCallableError(new MovieDnaServerError(SERVER_ERROR_CODES.UNAUTHENTICATED))
    }
    if (!request.app) {
      throw safeCallableError(new MovieDnaServerError(SERVER_ERROR_CODES.APP_CHECK_REQUIRED))
    }
    try {
      return await recalculate(request.auth.uid, { manual: true })
    } catch (error) {
      throw safeCallableError(error)
    }
  }
  return { sourceWrite, savedMediaWrite, manualRefresh }
}
