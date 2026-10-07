export const RECOMMENDATION_CLIENT_ALGORITHM_VERSION = '1.6.0'

export class RecommendationClientError extends Error {
  constructor(code = 'malformed') {
    super('Recommendations could not be loaded.')
    this.name = 'RecommendationClientError'
    this.code = code
  }
}

function fail(code = 'malformed') {
  throw new RecommendationClientError(code)
}

function plain(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
}

function finiteInRange(value, min, max) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= min
    && value <= max
}

function validTmdbId(value) {
  return Number.isSafeInteger(value) && value > 0
}

function normalizeImagePath(value) {
  if (value === null || value === undefined) return null

  if (
    typeof value === 'string'
    && /^\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(value)
  ) {
    return value
  }

  fail()
}

function normalizeDate(value) {
  if (value === null || value === undefined) return null

  if (
    typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    fail()
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    fail()
  }

  return value
}

function normalizeVoteAverage(value) {
  if (value === null || value === undefined) return null
  if (!finiteInRange(value, 0, 10)) fail()
  return value
}

function normalizeVoteCount(value) {
  if (value === undefined) return 0

  if (
    !Number.isSafeInteger(value)
    || value < 0
  ) {
    fail()
  }

  return value
}

function normalizeReasons(value) {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > 3
  ) {
    fail()
  }

  const reasons = value.map(reason => {
    if (
      typeof reason !== 'string'
      || !reason.trim()
    ) {
      fail()
    }

    return reason.trim()
  })

  return Object.freeze(reasons)
}

function normalizeResult(value) {
  if (!plain(value)) fail()

  const {
    mediaKey,
    tmdbId,
    mediaType,
    title,
    score,
    metadataCoverage,
    profileEvidenceCoverage,
    hasPersonalizationEvidence,
    popularity,
  } = value

  if (
    !validTmdbId(tmdbId)
    || !['movie', 'tv'].includes(mediaType)
    || mediaKey !== `${mediaType}_${tmdbId}`
    || typeof title !== 'string'
    || !title.trim()
    || !finiteInRange(score, 0, 100)
    || !finiteInRange(metadataCoverage, 0, 1)
    || !finiteInRange(profileEvidenceCoverage, 0, 1)
    || typeof hasPersonalizationEvidence !== 'boolean'
    || typeof popularity !== 'number'
    || !Number.isFinite(popularity)
    || popularity < 0
  ) {
    fail()
  }

  return Object.freeze({
    id: tmdbId,
    mediaKey,
    tmdbId,
    mediaType,
    title: title.trim(),
    posterPath: normalizeImagePath(value.posterPath),
    releaseDate: normalizeDate(value.releaseDate),
    voteAverage: normalizeVoteAverage(value.voteAverage),
    voteCount: normalizeVoteCount(value.voteCount),
    score,
    metadataCoverage,
    profileEvidenceCoverage,
    hasPersonalizationEvidence,
    reasons: normalizeReasons(value.reasons),
    popularity,
  })
}

function normalizeGenreIds(value) {
  if (!Array.isArray(value)) fail()

  const ids = []

  for (const id of value) {
    if (
      !Number.isSafeInteger(id)
      || id <= 0
      || ids.includes(id)
    ) {
      fail()
    }

    ids.push(id)
  }

  return Object.freeze(ids)
}

export function normalizeRecommendationsResponse(value) {
  if (
    !plain(value)
    || value.algorithmVersion
      !== RECOMMENDATION_CLIENT_ALGORITHM_VERSION
    || !Array.isArray(value.results)
  ) {
    fail(
      value?.algorithmVersion
      && value.algorithmVersion
        !== RECOMMENDATION_CLIENT_ALGORITHM_VERSION
        ? 'unsupported-version'
        : 'malformed',
    )
  }

  const seen = new Set()

  const results = value.results.map(result => {
    const normalized = normalizeResult(result)

    if (seen.has(normalized.mediaKey)) fail()

    seen.add(normalized.mediaKey)
    return normalized
  })

  return Object.freeze({
    algorithmVersion: value.algorithmVersion,
    genreIds: normalizeGenreIds(value.genreIds),
    results: Object.freeze(results),
  })
}
