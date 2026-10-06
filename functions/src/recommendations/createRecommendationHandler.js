import { HttpsError } from 'firebase-functions/v2/https'
import {
  MovieDnaServerError,
  SERVER_ERROR_CODES,
} from '../errors.js'
import {
  RecommendationError,
} from './core/recommendationErrors.js'

const RECOMMENDATION_LANGUAGES = new Set([
  'en-US',
  'fr-FR',
  'ru-RU',
])

function recommendationLanguage(data) {
  if (
    data === undefined
    || data === null
  ) {
    return 'en-US'
  }

  if (
    typeof data !== 'object'
    || Array.isArray(data)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid recommendation language.',
    )
  }

  const keys = Object.keys(data)

  // Keep the previous empty callable payload backwards-compatible.
  if (!keys.length) return 'en-US'

  if (
    keys.length !== 1
    || keys[0] !== 'language'
    || !RECOMMENDATION_LANGUAGES.has(
      data.language,
    )
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid recommendation language.',
    )
  }

  return data.language
}

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

    const language = recommendationLanguage(
      request.data,
    )

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
        seedSignals:
          Array.isArray(context.seedSignals)
            ? context.seedSignals
            : [],
        watched: Array.isArray(context.watched)
          ? context.watched
          : [],
        hidden: Array.isArray(context.hidden)
          ? context.hidden
          : [],
        language,
      })
    } catch (error) {
      throw safeCallableError(error)
    }
  }
}
