export const REGION = 'europe-west6'
export const MAX_SOURCE_ITEMS = 500
export const MAX_TMDB_CONCURRENCY = 4
export const TMDB_TIMEOUT_MS = 8_000
export const TMDB_PROXY_TIMEOUT_MS = 8_000
export const TMDB_PROXY_MAX_RESPONSE_BYTES = 2 * 1024 * 1024
export const TMDB_TRANSIENT_RETRIES = 2
export const MEDIA_CACHE_TTL_MS = 24 * 60 * 60 * 1000
export const MANUAL_REFRESH_COOLDOWN_MS = 15 * 60 * 1000

export const RUNTIME_OPTIONS = Object.freeze({
  region: REGION,
  memory: '512MiB',
  timeoutSeconds: 120,
  minInstances: 0,
  maxInstances: 4,
  concurrency: 10,
})

export const REFRESH_MOVIE_DNA_OPTIONS = Object.freeze({
  ...RUNTIME_OPTIONS,
  enforceAppCheck: true,
})

export const RECOMMENDATION_OPTIONS = Object.freeze({
  ...RUNTIME_OPTIONS,
  enforceAppCheck: true,
})

export const TMDB_PROXY_OPTIONS = Object.freeze({
  region: REGION,
  memory: '512MiB',
  timeoutSeconds: 30,
  minInstances: 0,
  maxInstances: 4,
  concurrency: 10,
  cors: false,
})
