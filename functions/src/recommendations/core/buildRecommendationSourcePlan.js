import {
  RECOMMENDATION_ERROR_CODES,
  throwRecommendationError,
} from './recommendationErrors.js'

const DEFAULT_MAX_GENRES = 3
const MAX_GENRES = 5
const GENRE_KEY = /^genre:([1-9]\d*)$/

function plain(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function validMaxGenres(value) {
  return Number.isSafeInteger(value)
    && value >= 0
    && value <= MAX_GENRES
}

function effectiveGenreScore(entry) {
  if (
    !plain(entry)
    || typeof entry.key !== 'string'
    || !GENRE_KEY.test(entry.key)
    || typeof entry.score !== 'number'
    || !Number.isFinite(entry.score)
    || entry.score < -1
    || entry.score > 1
    || typeof entry.confidence !== 'number'
    || !Number.isFinite(entry.confidence)
    || entry.confidence < 0
    || entry.confidence > 1
  ) {
    return null
  }

  const match = entry.key.match(GENRE_KEY)
  const genreId = Number(match[1])

  if (!Number.isSafeInteger(genreId) || genreId <= 0) {
    return null
  }

  return {
    genreId,
    effectiveScore: entry.score * entry.confidence,
  }
}

export function preferredRecommendationGenreIds(
  dna,
  maxGenres = DEFAULT_MAX_GENRES,
) {
  if (
    !plain(dna)
    || !plain(dna.dimensions)
    || !Array.isArray(dna.dimensions.genres)
    || !validMaxGenres(maxGenres)
  ) {
    throwRecommendationError(
      RECOMMENDATION_ERROR_CODES.INVALID_INPUT,
    )
  }

  const strongestByGenre = new Map()

  for (const entry of dna.dimensions.genres) {
    const normalized = effectiveGenreScore(entry)

    if (!normalized || normalized.effectiveScore <= 0) {
      continue
    }

    const existing = strongestByGenre.get(
      normalized.genreId,
    )

    if (
      existing === undefined
      || normalized.effectiveScore > existing
    ) {
      strongestByGenre.set(
        normalized.genreId,
        normalized.effectiveScore,
      )
    }
  }

  return Object.freeze(
    [...strongestByGenre.entries()]
      .sort(
        (a, b) => b[1] - a[1]
          || a[0] - b[0],
      )
      .slice(0, maxGenres)
      .map(([genreId]) => genreId),
  )
}

export function buildRecommendationSourcePlan({
  dna,
  maxGenres = DEFAULT_MAX_GENRES,
} = {}) {
  const genreIds = preferredRecommendationGenreIds(
    dna,
    maxGenres,
  )

  const requests = [
    { type: 'trending', mediaType: 'movie' },
    { type: 'popular', mediaType: 'movie', page: 1 },
    { type: 'popular', mediaType: 'movie', page: 2 },
    { type: 'popular', mediaType: 'movie', page: 3 },
    { type: 'topRated', mediaType: 'movie', page: 1 },
    { type: 'trending', mediaType: 'tv' },
    { type: 'popular', mediaType: 'tv', page: 1 },
    { type: 'popular', mediaType: 'tv', page: 2 },
    { type: 'popular', mediaType: 'tv', page: 3 },
    { type: 'topRated', mediaType: 'tv', page: 1 },
  ]

  for (const genreId of genreIds) {
    for (const page of [1, 2]) {
      requests.push(
        {
          type: 'genre',
          mediaType: 'movie',
          genreId,
          page,
        },
        {
          type: 'genre',
          mediaType: 'tv',
          genreId,
          page,
        },
      )
    }
  }

  return Object.freeze({
    genreIds,
    requests: Object.freeze(
      requests.map(request => Object.freeze(request)),
    ),
  })
}
