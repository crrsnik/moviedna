import {
  TMDB_TIMEOUT_MS,
  TMDB_TRANSIENT_RETRIES,
} from '../../config.js'
import {
  MovieDnaServerError,
  SERVER_ERROR_CODES,
} from '../../errors.js'

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3/'
const MEDIA_TYPES = new Set(['movie', 'tv'])
const MAX_PAGE = 500

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}

function validPage(value) {
  return positiveInteger(value) && value <= MAX_PAGE
}

function validateMediaType(mediaType) {
  if (!MEDIA_TYPES.has(mediaType)) {
    throw new MovieDnaServerError(
      SERVER_ERROR_CODES.INVALID_SOURCE,
    )
  }
}

function validatePage(page) {
  if (!validPage(page)) {
    throw new MovieDnaServerError(
      SERVER_ERROR_CODES.INVALID_SOURCE,
    )
  }
}

function retryDelay(response, attempt) {
  const retryAfter = Number(
    response?.headers?.get?.('retry-after'),
  )

  return Number.isFinite(retryAfter) && retryAfter >= 0
    ? Math.min(retryAfter * 1000, 5_000)
    : 100 * (2 ** attempt)
}

const ALLOWED_LANGUAGES = new Set([
  'en-US',
  'fr-FR',
  'ru-RU',
])

function validateLanguage(language) {
  if (!ALLOWED_LANGUAGES.has(language)) {
    throw new MovieDnaServerError(
      SERVER_ERROR_CODES.INVALID_SOURCE,
    )
  }
}

function sourceEnvelope(mediaType, source, results) {
  return Object.freeze({
    mediaType,
    source,
    results: Object.freeze(results),
  })
}

export function createRecommendationTmdbClient({
  token,
  fetchImpl = globalThis.fetch,
  sleep = milliseconds => new Promise(
    resolve => setTimeout(resolve, milliseconds),
  ),
  timeoutMs = TMDB_TIMEOUT_MS,
  retries = TMDB_TRANSIENT_RETRIES,
} = {}) {
  if (
    typeof token !== 'string'
    || !token.trim()
    || typeof fetchImpl !== 'function'
  ) {
    throw new MovieDnaServerError(
      SERVER_ERROR_CODES.TMDB_UNAVAILABLE,
    )
  }

  const authorization = `Bearer ${token.trim()}`

  async function request(path, params) {
    const url = new URL(
      path.replace(/^\//, ''),
      TMDB_API_BASE_URL,
    )

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value))
    }

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs,
      )

      try {
        const response = await fetchImpl(url, {
          method: 'GET',
          headers: {
            Authorization: authorization,
            Accept: 'application/json',
          },
          redirect: 'error',
          signal: controller.signal,
        })

        if (response.ok) {
          let payload

          try {
            payload = await response.json()
          } catch {
            throw new MovieDnaServerError(
              SERVER_ERROR_CODES.TMDB_UNAVAILABLE,
            )
          }

          if (
            !payload
            || typeof payload !== 'object'
            || Array.isArray(payload)
            || !Array.isArray(payload.results)
          ) {
            throw new MovieDnaServerError(
              SERVER_ERROR_CODES.TMDB_UNAVAILABLE,
            )
          }

          return payload.results
        }

        if (
          (response.status === 429 || response.status >= 500)
          && attempt < retries
        ) {
          await sleep(retryDelay(response, attempt))
          continue
        }

        throw new MovieDnaServerError(
          response.status === 429
            ? SERVER_ERROR_CODES.RATE_LIMITED
            : SERVER_ERROR_CODES.TMDB_UNAVAILABLE,
        )
      } catch (error) {
        if (error instanceof MovieDnaServerError) {
          throw error
        }

        if (error?.name === 'AbortError') {
          if (attempt < retries) {
            await sleep(retryDelay(null, attempt))
            continue
          }

          throw new MovieDnaServerError(
            SERVER_ERROR_CODES.TIMEOUT,
          )
        }

        if (attempt < retries) {
          await sleep(retryDelay(null, attempt))
          continue
        }

        throw new MovieDnaServerError(
          SERVER_ERROR_CODES.TMDB_UNAVAILABLE,
        )
      } finally {
        clearTimeout(timeout)
      }
    }

    throw new MovieDnaServerError(
      SERVER_ERROR_CODES.TMDB_UNAVAILABLE,
    )
  }

  async function getTrending(
    mediaType,
    language = 'en-US',
  ) {
    validateMediaType(mediaType)
    validateLanguage(language)

    const results = await request(
      `trending/${mediaType}/day`,
      {
        language,
      },
    )

    return sourceEnvelope(
      mediaType,
      'trending',
      results,
    )
  }

  async function getPopular(
    mediaType,
    page = 1,
    language = 'en-US',
  ) {
    validateMediaType(mediaType)
    validatePage(page)
    validateLanguage(language)
    validateLanguage(language)

    const results = await request(
      `${mediaType}/popular`,
      {
        language,
        page,
      },
    )

    return sourceEnvelope(
      mediaType,
      `popular:${page}`,
      results,
    )
  }

  async function getTopRated(
    mediaType,
    page = 1,
    language = 'en-US',
  ) {
    validateMediaType(mediaType)
    validatePage(page)
    validateLanguage(language)

    const results = await request(
      `${mediaType}/top_rated`,
      {
        language,
        page,
      },
    )

    return sourceEnvelope(
      mediaType,
      `top-rated:${page}`,
      results,
    )
  }

  async function discoverByGenre(
    mediaType,
    genreId,
    page = 1,
    language = 'en-US',
  ) {
    validateMediaType(mediaType)
    validatePage(page)

    if (!positiveInteger(genreId)) {
      throw new MovieDnaServerError(
        SERVER_ERROR_CODES.INVALID_SOURCE,
      )
    }

    const params = {
      language,
      page,
      sort_by: 'popularity.desc',
      include_adult: 'false',
      with_genres: genreId,
    }

    if (mediaType === 'movie') {
      params.include_video = 'false'
    } else {
      params.include_null_first_air_dates = 'false'
    }

    const results = await request(
      `discover/${mediaType}`,
      params,
    )

    return sourceEnvelope(
      mediaType,
      `genre:${genreId}:${page}`,
      results,
    )
  }

  return Object.freeze({
    getTrending,
    getPopular,
    getTopRated,
    discoverByGenre,
  })
}
