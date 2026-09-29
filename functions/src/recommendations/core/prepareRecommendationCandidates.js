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
  if (!plain(payload)) return null

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
    metadata: Object.freeze(metadata),
  })
}
