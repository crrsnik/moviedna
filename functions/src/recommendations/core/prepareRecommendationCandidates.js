import { inferTasteTags } from '../../dna/core/tasteTaxonomy.js'
import { recommendationMediaKey } from './rankRecommendations.js'

const MEDIA_TYPES = new Set(['movie', 'tv'])
const METADATA_STATUSES = new Set(['ready', 'partial', 'missing', 'temporary-error'])

function plain(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}

function nonNegativeFinite(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
}

function normalizeImagePath(value) {
  return typeof value === 'string'
    && /^\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(value)
    ? value
    : null
}

function normalizeDate(value) {
  if (
    typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null
  }

  const [year, month, day] = value
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(year, month - 1, day),
  )

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  )
    ? value
    : null
}

function normalizeVoteAverage(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= 10
    ? value
    : null
}

function normalizeVoteCount(value) {
  return Number.isSafeInteger(value)
    && value >= 0
    ? value
    : 0
}

function normalizeTitle(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function ids(values) {
  if (!Array.isArray(values)) return null

  const result = values.map((value) => value?.id)

  if (result.some((value) => !positiveInteger(value))) return null

  return result
}

function keywords(values) {
  if (values === undefined) return []

  if (
    !Array.isArray(values)
    || values.length > 100
  ) {
    return null
  }

  const unique = new Map()

  for (const value of values) {
    if (
      !plain(value)
      || !positiveInteger(value.id)
      || typeof value.name !== 'string'
    ) {
      return null
    }

    const name = value.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')

    if (
      !name
      || name.length > 100
    ) {
      return null
    }

    if (!unique.has(value.id)) {
      unique.set(
        value.id,
        {
          id: value.id,
          name,
        },
      )
    }
  }

  return [...unique.values()]
    .sort(
      (a, b) => (
        a.id - b.id
        || a.name.localeCompare(b.name)
      ),
    )
}

function countryCodes(values) {
  if (!Array.isArray(values)) return null

  const result = values.map((value) => value?.code)

  if (result.some((value) => (
    typeof value !== 'string'
    || !/^[A-Z]{2}$/.test(value)
  ))) return null

  return result
}

export function normalizeTmdbDiscoveryCandidate(
  payload,
  explicitMediaType,
) {
  if (!plain(payload) || payload.adult === true) return null

  const mediaType = explicitMediaType ?? payload.media_type

  if (!MEDIA_TYPES.has(mediaType) || !positiveInteger(payload.id)) {
    return null
  }

  if (
    payload.media_type !== undefined
    && payload.media_type !== mediaType
  ) {
    return null
  }

  const popularity = payload.popularity ?? 0

  if (!nonNegativeFinite(popularity)) return null

  const mediaKey = recommendationMediaKey(mediaType, payload.id)

  if (!mediaKey) return null

  const title = normalizeTitle(
    mediaType === 'movie'
      ? payload.title
      : payload.name,
  )

  return Object.freeze({
    mediaKey,
    tmdbId: payload.id,
    mediaType,
    title,
    popularity,
    posterPath: normalizeImagePath(payload.poster_path),
    releaseDate: normalizeDate(
      mediaType === 'movie'
        ? payload.release_date
        : payload.first_air_date,
    ),
    voteAverage: normalizeVoteAverage(
      payload.vote_average,
    ),
    voteCount: normalizeVoteCount(
      payload.vote_count,
    ),
  })
}

export function recommendationMetadataFromResolved(
  metadata,
  mediaType,
) {
  if (
    !MEDIA_TYPES.has(mediaType)
    || !plain(metadata)
    || !METADATA_STATUSES.has(metadata.status)
    || !plain(metadata.completeness)
  ) {
    return null
  }

  const completeness = metadata.completeness
  const result = {}

  const normalizedKeywords = keywords(
    metadata.keywords,
  )

  if (!normalizedKeywords) return null

  if (completeness.genres === true) {
    const genreIds = ids(metadata.genres)
    if (!genreIds) return null
    result.genreIds = genreIds
  }

  if (completeness.releaseYear === true) {
    if (
      !Number.isInteger(metadata.releaseYear)
      || metadata.releaseYear < 1800
      || metadata.releaseYear > 2200
    ) {
      return null
    }

    result.releaseYear = metadata.releaseYear
  }

  if (completeness.originalLanguage === true) {
    const code = metadata.originalLanguage?.code

    if (typeof code !== 'string' || !/^[a-z]{2}$/.test(code)) {
      return null
    }

    result.originalLanguage = code
  }

  if (completeness.countries === true) {
    const codes = countryCodes(metadata.countries)
    if (!codes) return null
    result.countryCodes = codes
  }

  if (completeness.people === true) {
    const actors = ids(metadata.actors)
    if (!actors) return null

    result.actors = actors.map((id) => ({ id }))

    if (mediaType === 'movie') {
      const directors = ids(metadata.directors)
      if (!directors) return null
      result.directors = directors.map((id) => ({ id }))
    } else {
      const creators = ids(metadata.creators)
      if (!creators) return null
      result.creators = creators.map((id) => ({ id }))
    }
  }

  const taxonomyMetadata = {
    genres: (result.genreIds ?? []).map(
      id => ({
        id,
        label: String(id),
      }),
    ),
    keywords: normalizedKeywords,
    originalLanguage: result.originalLanguage
      ? {
          code: result.originalLanguage,
          label: result.originalLanguage,
        }
      : null,
    countries: (result.countryCodes ?? []).map(
      code => ({
        code,
        label: code,
      }),
    ),
  }

  const inferredTasteTags = inferTasteTags(
    taxonomyMetadata,
    mediaType,
  )

  if (inferredTasteTags.length) {
    result.tasteTags = inferredTasteTags
  }

  return result
}

export function prepareRecommendationCandidate(value) {
  if (!plain(value)) return null

  const mediaKey = recommendationMediaKey(
    value.mediaType,
    value.tmdbId,
  )

  if (!mediaKey || value.mediaKey !== mediaKey) return null

  const metadata = recommendationMetadataFromResolved(
    value.metadata,
    value.mediaType,
  )

  if (!metadata) return null

  const popularity = value.popularity ?? 0

  if (!nonNegativeFinite(popularity)) return null

  return Object.freeze({
    mediaKey,
    tmdbId: value.tmdbId,
    mediaType: value.mediaType,
    title: normalizeTitle(value.title),
    popularity,
    posterPath: normalizeImagePath(
      value.posterPath,
    ),
    releaseDate: normalizeDate(
      value.releaseDate,
    ),
    voteAverage: normalizeVoteAverage(
      value.voteAverage,
    ),
    voteCount: normalizeVoteCount(
      value.voteCount,
    ),
    metadata: Object.freeze(metadata),
  })
}
