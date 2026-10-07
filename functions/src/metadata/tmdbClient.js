import { TMDB_TIMEOUT_MS, TMDB_TRANSIENT_RETRIES } from '../config.js'
import { MovieDnaServerError, SERVER_ERROR_CODES } from '../errors.js'
import { normalizeMovieMetadata, normalizeTvMetadata } from './normalizeTmdbMetadata.js'

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3/'

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers?.get?.('retry-after'))
  return Number.isFinite(retryAfter) && retryAfter >= 0
    ? Math.min(retryAfter * 1000, 5_000)
    : 100 * (2 ** attempt)
}

export function createTmdbClient({
  token,
  fetchImpl = globalThis.fetch,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  timeoutMs = TMDB_TIMEOUT_MS,
  retries = TMDB_TRANSIENT_RETRIES,
} = {}) {
  if (typeof token !== 'string' || !token || typeof fetchImpl !== 'function') {
    throw new MovieDnaServerError(SERVER_ERROR_CODES.TMDB_UNAVAILABLE)
  }

  async function request(mediaType, tmdbId) {
    if (!['movie', 'tv'].includes(mediaType) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
      throw new MovieDnaServerError(SERVER_ERROR_CODES.INVALID_METADATA)
    }
    const append = mediaType === 'movie'
      ? 'credits,keywords'
      : 'aggregate_credits,keywords'
    const url = new URL(`${mediaType}/${tmdbId}`, TMDB_API_BASE_URL)
    url.searchParams.set('language', 'en-US')
    url.searchParams.set('append_to_response', append)

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetchImpl(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: controller.signal,
        })
        if (response.status === 404) return null
        if (response.ok) {
          const payload = await response.json()
          const metadata = mediaType === 'movie'
            ? normalizeMovieMetadata(payload)
            : normalizeTvMetadata(payload)
          if (metadata.tmdbId !== tmdbId || metadata.mediaType !== mediaType) {
            throw new MovieDnaServerError(SERVER_ERROR_CODES.INVALID_METADATA)
          }
          return metadata
        }
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          await sleep(retryDelay(response, attempt))
          continue
        }
        throw new MovieDnaServerError(response.status === 429
          ? SERVER_ERROR_CODES.RATE_LIMITED
          : SERVER_ERROR_CODES.TMDB_UNAVAILABLE)
      } catch (error) {
        if (error instanceof MovieDnaServerError) throw error
        if (error?.name === 'AbortError') {
          if (attempt < retries) {
            await sleep(retryDelay(null, attempt))
            continue
          }
          throw new MovieDnaServerError(SERVER_ERROR_CODES.TIMEOUT)
        }
        if (attempt < retries) {
          await sleep(retryDelay(null, attempt))
          continue
        }
        throw new MovieDnaServerError(SERVER_ERROR_CODES.TMDB_UNAVAILABLE)
      } finally {
        clearTimeout(timeout)
      }
    }
    throw new MovieDnaServerError(SERVER_ERROR_CODES.TMDB_UNAVAILABLE)
  }

  return { getMetadata: request }
}
