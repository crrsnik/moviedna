export const SERVER_ERROR_CODES = Object.freeze({
  INVALID_PROFILE: 'invalid-profile',
  ONBOARDING_REQUIRED: 'onboarding-required',
  INVALID_SOURCE: 'invalid-source',
  SOURCE_LIMIT_EXCEEDED: 'source-limit-exceeded',
  IDENTITY_CONFLICT: 'identity-conflict',
  INVALID_METADATA: 'invalid-metadata',
  TMDB_UNAVAILABLE: 'tmdb-unavailable',
  RATE_LIMITED: 'rate-limited',
  TIMEOUT: 'timeout',
  STALE_SOURCE: 'stale-source',
  STALE_RUN: 'stale-run',
  COOLDOWN: 'cooldown',
  UNAUTHENTICATED: 'unauthenticated',
  INTERNAL: 'internal',
})

const SAFE_MESSAGES = Object.freeze({
  [SERVER_ERROR_CODES.INVALID_PROFILE]: 'The user profile is unavailable.',
  [SERVER_ERROR_CODES.ONBOARDING_REQUIRED]: 'Complete onboarding before refreshing MovieDNA.',
  [SERVER_ERROR_CODES.INVALID_SOURCE]: 'A MovieDNA source is invalid.',
  [SERVER_ERROR_CODES.SOURCE_LIMIT_EXCEEDED]: 'There are too many MovieDNA sources for one calculation.',
  [SERVER_ERROR_CODES.IDENTITY_CONFLICT]: 'MovieDNA source identity is inconsistent.',
  [SERVER_ERROR_CODES.INVALID_METADATA]: 'MovieDNA metadata is invalid.',
  [SERVER_ERROR_CODES.TMDB_UNAVAILABLE]: 'Movie metadata is temporarily unavailable.',
  [SERVER_ERROR_CODES.RATE_LIMITED]: 'Movie metadata is temporarily rate limited.',
  [SERVER_ERROR_CODES.TIMEOUT]: 'Movie metadata request timed out.',
  [SERVER_ERROR_CODES.STALE_SOURCE]: 'MovieDNA sources changed during calculation.',
  [SERVER_ERROR_CODES.STALE_RUN]: 'A newer MovieDNA calculation is active.',
  [SERVER_ERROR_CODES.COOLDOWN]: 'MovieDNA was refreshed recently.',
  [SERVER_ERROR_CODES.UNAUTHENTICATED]: 'Authentication is required.',
  [SERVER_ERROR_CODES.INTERNAL]: 'MovieDNA could not be refreshed.',
})

export class MovieDnaServerError extends Error {
  constructor(code) {
    super(SAFE_MESSAGES[code] ?? SAFE_MESSAGES[SERVER_ERROR_CODES.INTERNAL])
    this.name = 'MovieDnaServerError'
    this.code = code in SAFE_MESSAGES ? code : SERVER_ERROR_CODES.INTERNAL
  }
}

export function safeErrorCode(error) {
  return error instanceof MovieDnaServerError ? error.code : SERVER_ERROR_CODES.INTERNAL
}
