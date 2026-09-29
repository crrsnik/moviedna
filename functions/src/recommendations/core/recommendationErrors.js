export const RECOMMENDATION_ERROR_CODES = Object.freeze({
  INVALID_INPUT: 'invalid-input',
  INVALID_DNA: 'invalid-dna',
  UNSUPPORTED_VERSION: 'unsupported-version',
})

export class RecommendationError extends Error {
  constructor(code) {
    super('Recommendation ranking could not be completed.')
    this.name = 'RecommendationError'
    this.code = code
  }
}

export function throwRecommendationError(code) {
  throw new RecommendationError(code)
}
