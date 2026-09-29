import {
  normalizeRecommendationsResponse,
  RecommendationClientError,
} from './normalizeRecommendations.js'

const SAFE_CALLABLE_CODES = new Set([
  'unauthenticated',
  'failed-precondition',
  'resource-exhausted',
  'unavailable',
  'internal',
])

function safeCallableCode(error) {
  if (typeof error?.code !== 'string') return 'unknown'

  const code = error.code.replace(/^functions\//, '')

  return SAFE_CALLABLE_CODES.has(code)
    ? code
    : 'unknown'
}

export function createRecommendationService({
  callRecommendations,
} = {}) {
  if (typeof callRecommendations !== 'function') {
    throw new TypeError(
      'A recommendation callable is required.',
    )
  }

  return Object.freeze({
    async getRecommendations() {
      try {
        const response = await callRecommendations()

        return normalizeRecommendationsResponse(
          response?.data,
        )
      } catch (error) {
        if (error instanceof RecommendationClientError) {
          throw error
        }

        throw new RecommendationClientError(
          safeCallableCode(error),
        )
      }
    },
  })
}
