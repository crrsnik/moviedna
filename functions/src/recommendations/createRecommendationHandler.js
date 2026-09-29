import { HttpsError } from 'firebase-functions/v2/https'
import {
  MovieDnaServerError,
  SERVER_ERROR_CODES,
} from '../errors.js'
import {
  RecommendationError,
} from './core/recommendationErrors.js'

function safeCallableError(error) {
  if (error instanceof HttpsError) return error

  if (error instanceof MovieDnaServerError) {
    const code =
      error.code === SERVER_ERROR_CODES.UNAUTHENTICATED
        ? 'unauthenticated'
        : error.code === SERVER_ERROR_CODES.APP_CHECK_REQUIRED
          ? 'failed-precondition'
          : error.code === SERVER_ERROR_CODES.RATE_LIMITED
            ? 'resource-exhausted'
            : (
                error.code === SERVER_ERROR_CODES.TIMEOUT
                || error.code === SERVER_ERROR_CODES.TMDB_UNAVAILABLE
              )
              ? 'unavailable'
              : 'internal'

    return new HttpsError(code, error.message)
  }

  if (error instanceof RecommendationError) {
    return new HttpsError(
      'failed-precondition',
      'MovieDNA is not ready for recommendations.',
    )
  }

  return new HttpsError(
    'internal',
    'Recommendations could not be loaded.',
  )
}

export function createRecommendationHandler({
  loadContext,
  pipeline,
  requireAppCheck = true,
} = {}) {
  if (
    typeof loadContext !== 'function'
    || !pipeline
    || typeof pipeline.run !== 'function'
  ) {
    throw new TypeError(
      'Invalid recommendation handler dependencies.',
    )
  }

  return async function recommendations(request) {
    if (!request.auth?.uid) {
      throw safeCallableError(
        new MovieDnaServerError(
          SERVER_ERROR_CODES.UNAUTHENTICATED,
        ),
      )
    }

    if (requireAppCheck && !request.app) {
      throw safeCallableError(
        new MovieDnaServerError(
          SERVER_ERROR_CODES.APP_CHECK_REQUIRED,
        ),
      )
    }

    try {
      const context = await loadContext(
        request.auth.uid,
      )

      if (
        !context?.dna
        || !Array.isArray(context.rated)
      ) {
        throw new RecommendationError(
          'invalid-context',
        )
      }

      return await pipeline.run({
        dna: context.dna,
        rated: context.rated,
        hidden: [],
      })
    } catch (error) {
      throw safeCallableError(error)
    }
  }
}
