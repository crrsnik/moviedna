export const MOVIEDNA_ERROR_CODES = Object.freeze({
  INVALID_INPUT: 'invalid-input',
  DUPLICATE_SOURCE_ENTRY: 'duplicate-source-entry',
  MEDIA_IDENTITY_MISMATCH: 'media-identity-mismatch',
  INVALID_RATING: 'invalid-rating',
  INVALID_REACTION: 'invalid-reaction',
  INVALID_METADATA: 'invalid-metadata',
  UNSUPPORTED_ALGORITHM_VERSION: 'unsupported-algorithm-version',
})

const ERROR_MESSAGES = Object.freeze({
  [MOVIEDNA_ERROR_CODES.INVALID_INPUT]: 'MovieDNA input is invalid.',
  [MOVIEDNA_ERROR_CODES.DUPLICATE_SOURCE_ENTRY]: 'MovieDNA input contains a duplicate media item.',
  [MOVIEDNA_ERROR_CODES.MEDIA_IDENTITY_MISMATCH]: 'MovieDNA media identity is inconsistent.',
  [MOVIEDNA_ERROR_CODES.INVALID_RATING]: 'MovieDNA rating is invalid.',
  [MOVIEDNA_ERROR_CODES.INVALID_REACTION]: 'MovieDNA onboarding reaction is invalid.',
  [MOVIEDNA_ERROR_CODES.INVALID_METADATA]: 'MovieDNA metadata is invalid.',
  [MOVIEDNA_ERROR_CODES.UNSUPPORTED_ALGORITHM_VERSION]: 'MovieDNA algorithm version is unsupported.',
})

export class MovieDnaError extends Error {
  constructor(code) {
    super(ERROR_MESSAGES[code] ?? ERROR_MESSAGES[MOVIEDNA_ERROR_CODES.INVALID_INPUT])
    this.name = 'MovieDnaError'
    this.code = code
  }
}

export function throwMovieDnaError(code) {
  throw new MovieDnaError(code)
}
