import {
  RECOMMENDATION_ALGORITHM_VERSION,
  RECOMMENDATION_DIMENSION_WEIGHTS,
  RECOMMENDATION_NEUTRAL_SCORE,
  RECOMMENDATION_ROUNDING_DECIMALS,
  RECOMMENDATION_SCORE_MAX,
  RECOMMENDATION_SCORE_MIN,
} from './recommendationConstants.js'
import { RECOMMENDATION_ERROR_CODES, throwRecommendationError } from './recommendationErrors.js'

const MEDIA_TYPES = new Set(['movie', 'tv'])
const COMMON_DIMENSIONS = ['genres', 'mediaTypes', 'decades', 'languages', 'countries', 'actors']
const DIMENSION_ORDER = ['genres', 'mediaTypes', 'decades', 'languages', 'countries', 'directors', 'creators', 'actors']
const DNA_KEY_PATTERNS = Object.freeze({
  genres: /^genre:[1-9]\d*$/,
  mediaTypes: /^media:(movie|tv)$/,
  decades: /^decade:(18|19|20|21)\d0$/,
  languages: /^language:[a-z]{2}$/,
  countries: /^country:[A-Z]{2}$/,
  directors: /^person:[1-9]\d*$/,
  creators: /^person:[1-9]\d*$/,
  actors: /^person:[1-9]\d*$/,
})
const REASON_LABELS = Object.freeze({
  genres: 'genre', mediaTypes: 'movie and TV', decades: 'era', languages: 'language',
  countries: 'country', directors: 'director', creators: 'creator', actors: 'cast',
})

function plain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function positiveInteger(value) { return Number.isSafeInteger(value) && value > 0 }
function finite(value, min, max) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max }
function round(value, decimals = RECOMMENDATION_ROUNDING_DECIMALS) {
  const result = Number(value.toFixed(decimals))
  return Object.is(result, -0) ? 0 : result
}
function uniqueSorted(values, compare = (a, b) => a.localeCompare(b)) { return [...new Set(values)].sort(compare) }

export function recommendationMediaKey(mediaType, tmdbId) {
  if (!MEDIA_TYPES.has(mediaType) || !positiveInteger(tmdbId)) return null
  return `${mediaType}_${tmdbId}`
}

function normalizeDna(dna) {
  if (!plain(dna) || dna.schemaVersion !== 1 || dna.algorithmVersion !== '1.0.0' || !plain(dna.dimensions)) {
    throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_DNA)
  }
  const index = {}
  for (const dimension of DIMENSION_ORDER) {
    const entries = dna.dimensions[dimension] ?? []
    if (!Array.isArray(entries)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_DNA)
    const values = new Map()
    for (const entry of entries) {
      if (!plain(entry) || typeof entry.key !== 'string' || !entry.key
        || !DNA_KEY_PATTERNS[dimension].test(entry.key)
        || !finite(entry.score, -1, 1) || !finite(entry.confidence, 0, 1)) continue
      if (values.has(entry.key)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_DNA)
      values.set(entry.key, round(entry.score * entry.confidence))
    }
    index[dimension] = values
  }
  return index
}

function normalizeIntegerList(value, maximum = 20) {
  if (value === undefined) return { available: false, values: [] }
  if (!Array.isArray(value) || value.length > maximum || value.some((item) => !positiveInteger(item))) return null
  return { available: true, values: uniqueSorted(value, (a, b) => a - b) }
}

function normalizeCodeList(value) {
  if (value === undefined) return { available: false, values: [] }
  if (!Array.isArray(value) || value.length > 20 || value.some((item) => typeof item !== 'string' || !/^[A-Z]{2}$/.test(item))) return null
  return { available: true, values: uniqueSorted(value) }
}

function normalizePeople(value, maximum) {
  if (value === undefined) return { available: false, values: [] }
  if (!Array.isArray(value) || value.length > maximum) return null
  const ids = value.map((person) => plain(person) ? person.id : person)
  if (ids.some((id) => !positiveInteger(id))) return null
  return { available: true, values: uniqueSorted(ids, (a, b) => a - b) }
}

function normalizeCandidate(value) {
  if (!plain(value)) return null
  const mediaKey = recommendationMediaKey(value.mediaType, value.tmdbId)
  if (!mediaKey || (value.mediaKey !== undefined && value.mediaKey !== mediaKey)) return null
  const metadata = value.metadata
  if (metadata !== undefined && !plain(metadata)) return null
  const source = metadata ?? {}
  const genres = normalizeIntegerList(source.genreIds)
  const countries = normalizeCodeList(source.countryCodes)
  const directors = normalizePeople(source.directors, 10)
  const creators = normalizePeople(source.creators, 10)
  const actors = normalizePeople(source.actors, 20)
  if (!genres || !countries || !directors || !creators || !actors) return null
  if (value.mediaType === 'movie' && creators.values.length) return null
  if (value.mediaType === 'tv' && directors.values.length) return null
  const releaseYear = source.releaseYear
  if (releaseYear !== undefined && releaseYear !== null
    && (!Number.isInteger(releaseYear) || releaseYear < 1800 || releaseYear > 2200)) return null
  const language = source.originalLanguage
  if (language !== undefined && language !== null && (typeof language !== 'string' || !/^[a-z]{2}$/.test(language))) return null
  const popularity = value.popularity ?? 0
  if (typeof popularity !== 'number' || !Number.isFinite(popularity) || popularity < 0) return null
  return {
    mediaKey, tmdbId: value.tmdbId, mediaType: value.mediaType,
    title: typeof value.title === 'string' && value.title.trim() ? value.title.trim() : null,
    popularity,
    features: {
      genres: { available: genres.available, keys: genres.values.map((id) => `genre:${id}`) },
      mediaTypes: { available: true, keys: [`media:${value.mediaType}`] },
      decades: { available: releaseYear !== undefined && releaseYear !== null, keys: releaseYear == null ? [] : [`decade:${Math.floor(releaseYear / 10) * 10}`] },
      languages: { available: language !== undefined && language !== null, keys: language == null ? [] : [`language:${language}`] },
      countries: { available: countries.available, keys: countries.values.map((code) => `country:${code}`) },
      directors: { available: directors.available, keys: directors.values.map((id) => `person:${id}`) },
      creators: { available: creators.available, keys: creators.values.map((id) => `person:${id}`) },
      actors: { available: actors.available, keys: actors.values.map((id) => `person:${id}`) },
    },
  }
}

function applicableDimensions(mediaType) {
  return [...COMMON_DIMENSIONS, mediaType === 'movie' ? 'directors' : 'creators']
}

function dimensionEvidence(dnaDimension, feature) {
  if (!feature.available || feature.keys.length === 0) return { match: 0, coverage: 0, hasEvidence: false }
  let matchedCount = 0
  const total = feature.keys.reduce((sum, key) => {
    if (!dnaDimension.has(key)) return sum
    matchedCount += 1
    return sum + dnaDimension.get(key)
  }, 0)
  return {
    match: round(total / feature.keys.length),
    coverage: round(matchedCount / feature.keys.length),
    hasEvidence: matchedCount > 0,
  }
}

function explanationReasons(breakdown) {
  const ranked = breakdown
    .filter((entry) => entry.contribution !== 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
      || DIMENSION_ORDER.indexOf(a.dimension) - DIMENSION_ORDER.indexOf(b.dimension))
    .slice(0, 3)
  if (!ranked.length) return ['Limited preference evidence for this title.']
  return ranked.map((entry) => entry.contribution > 0
    ? `Strong ${REASON_LABELS[entry.dimension]} match.`
    : `Some ${REASON_LABELS[entry.dimension]} signals are a weaker fit.`)
}

function rankCandidate(candidate, dna) {
  const dimensions = applicableDimensions(candidate.mediaType)
  let affinity = 0
  let coveredWeight = 0
  let evidenceWeight = 0
  let hasPersonalizationEvidence = false
  const breakdown = dimensions.map((dimension) => {
    const feature = candidate.features[dimension]
    const weight = RECOMMENDATION_DIMENSION_WEIGHTS[dimension]
    const evidence = dimensionEvidence(dna[dimension], feature)
    const contribution = round(weight * evidence.match)
    affinity += contribution
    if (feature.available) coveredWeight += weight
    evidenceWeight += weight * evidence.coverage
    hasPersonalizationEvidence ||= evidence.hasEvidence
    return Object.freeze({
      dimension, weight, match: evidence.match, contribution,
      metadataAvailable: feature.available, profileEvidenceCoverage: evidence.coverage,
    })
  })
  const score = round(Math.min(RECOMMENDATION_SCORE_MAX, Math.max(RECOMMENDATION_SCORE_MIN,
    RECOMMENDATION_NEUTRAL_SCORE + 50 * affinity)), 2)
  return Object.freeze({
    mediaKey: candidate.mediaKey, tmdbId: candidate.tmdbId, mediaType: candidate.mediaType,
    title: candidate.title, score, metadataCoverage: round(coveredWeight),
    profileEvidenceCoverage: round(evidenceWeight), hasPersonalizationEvidence,
    breakdown: Object.freeze(breakdown), reasons: Object.freeze(explanationReasons(breakdown)),
    popularity: candidate.popularity,
  })
}

function excludedKeys(values) {
  if (values === undefined) return []
  if (!Array.isArray(values)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
  return values.map((value) => {
    if (typeof value === 'string' && /^(movie|tv)_[1-9]\d*$/.test(value)) return value
    const key = recommendationMediaKey(value?.mediaType, value?.tmdbId)
    if (!key) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
    return key
  })
}

export function excludeKnownMedia(candidates, { rated = [], hidden = [] } = {}) {
  if (!Array.isArray(candidates)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
  const excluded = new Set([...excludedKeys(rated), ...excludedKeys(hidden)])
  return candidates.filter((candidate) => {
    const key = recommendationMediaKey(candidate?.mediaType, candidate?.tmdbId)
    return key !== null && !excluded.has(key)
  })
}

export function rankRecommendations({ dna, candidates, algorithmVersion = RECOMMENDATION_ALGORITHM_VERSION } = {}) {
  if (algorithmVersion !== RECOMMENDATION_ALGORITHM_VERSION) {
    throwRecommendationError(RECOMMENDATION_ERROR_CODES.UNSUPPORTED_VERSION)
  }
  if (!Array.isArray(candidates)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
  const dnaIndex = normalizeDna(dna)
  const normalized = candidates.map(normalizeCandidate)
  const counts = new Map()
  for (const candidate of normalized) if (candidate) counts.set(candidate.mediaKey, (counts.get(candidate.mediaKey) ?? 0) + 1)
  const accepted = normalized.filter((candidate) => candidate && counts.get(candidate.mediaKey) === 1)
  const results = accepted.map((candidate) => rankCandidate(candidate, dnaIndex))
    .sort((a, b) => b.score - a.score || b.metadataCoverage - a.metadataCoverage
      || b.popularity - a.popularity || a.mediaKey.localeCompare(b.mediaKey))
  return Object.freeze({
    algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
    results: Object.freeze(results),
    rejectedCount: candidates.length - accepted.length,
  })
}
