import {
  ACTOR_WEIGHT_MULTIPLIER,
  DEFAULT_GENRE_SPECIFICITY_WEIGHT,
  FAVORITE_WEIGHT,
  GENRE_SPECIFICITY_WEIGHTS,
  MOVIEDNA_ALGORITHM_VERSION,
  MOVIEDNA_ROUNDING_DECIMALS,
  ONBOARDING_WEIGHTS,
  RATING_WEIGHTS,
} from './movieDnaConstants.js'
import { MOVIEDNA_ERROR_CODES, throwMovieDnaError } from './movieDnaErrors.js'

const MEDIA_TYPES = new Set(['movie', 'tv'])
const REACTIONS = new Set(['like', 'dislike', 'skip'])
const METADATA_STATUSES = new Set(['ready', 'partial', 'missing', 'temporary-error'])
const DIMENSION_NAMES = [
  'genres', 'specificGenres', 'genrePairs',
  'mediaTypes', 'decades', 'languages',
  'countries', 'directors', 'creators', 'actors',
]
const COVERAGE_FIELDS = ['genres', 'releaseYear', 'originalLanguage', 'countries', 'people']

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}

function round(value) {
  const rounded = Number(value.toFixed(MOVIEDNA_ROUNDING_DECIMALS))
  return Object.is(rounded, -0) ? 0 : rounded
}

function normalizeLabel(value, fallback) {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'string') throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  const label = value.trim()
  if (!label || label.length > 100) throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  return label
}

function uniqueSorted(values, keyOf, compare) {
  const ordered = [...values].sort(compare)
  const unique = new Map()
  for (const value of ordered) {
    const key = keyOf(value)
    if (!unique.has(key)) unique.set(key, value)
  }
  return [...unique.values()]
}

function normalizeGenres(value) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 20) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  }
  const genres = value.map((genre) => {
    if (!isPlainObject(genre) || !isPositiveSafeInteger(genre.id)) {
      throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
    }
    return { key: `genre:${genre.id}`, label: normalizeLabel(genre.label, String(genre.id)), id: genre.id }
  })
  return uniqueSorted(genres, (genre) => genre.id, (a, b) => a.id - b.id || a.label.localeCompare(b.label))
}

function normalizeKeywords(value) {
  if (value === undefined) return []

  if (!Array.isArray(value) || value.length > 100) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  }

  const keywords = value.map((keyword) => {
    if (
      !isPlainObject(keyword)
      || !isPositiveSafeInteger(keyword.id)
      || typeof keyword.name !== 'string'
    ) {
      throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
    }

    const name = keyword.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')

    if (!name || name.length > 100) {
      throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
    }

    return {
      id: keyword.id,
      name,
    }
  })

  return uniqueSorted(
    keywords,
    (keyword) => keyword.id,
    (a, b) => (
      a.id - b.id
      || a.name.localeCompare(b.name)
    ),
  )
}

function normalizeCountries(value) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 20) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  }
  const countries = value.map((country) => {
    if (!isPlainObject(country) || typeof country.code !== 'string' || !/^[A-Z]{2}$/.test(country.code)) {
      throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
    }
    return {
      key: `country:${country.code}`,
      label: normalizeLabel(country.label, country.code),
      code: country.code,
    }
  })
  return uniqueSorted(countries, (country) => country.code, (a, b) => (
    a.code.localeCompare(b.code) || a.label.localeCompare(b.label)
  ))
}

function normalizePeople(value, role) {
  if (value === undefined) return []
  if (!Array.isArray(value) || (role !== 'actor' && value.length > 10)) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  }
  const people = value.map((person, index) => {
    if (!isPlainObject(person) || !isPositiveSafeInteger(person.id)) {
      throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
    }
    const billingOrder = role === 'actor' ? person.billingOrder : index
    if (role === 'actor' && (!Number.isInteger(billingOrder) || billingOrder < 0)) {
      throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
    }
    return {
      key: `person:${person.id}`,
      label: normalizeLabel(person.name, String(person.id)),
      id: person.id,
      billingOrder,
    }
  })
  const sorted = uniqueSorted(people, (person) => person.id, (a, b) => (
    role === 'actor'
      ? a.billingOrder - b.billingOrder || a.id - b.id || a.label.localeCompare(b.label)
      : a.id - b.id || a.label.localeCompare(b.label)
  ))
  return role === 'actor' ? sorted.slice(0, 3) : sorted
}

function normalizeCompleteness(value) {
  if (value === undefined) {
    return Object.fromEntries(COVERAGE_FIELDS.map((field) => [field, false]))
  }
  if (!isPlainObject(value) || Object.keys(value).length !== COVERAGE_FIELDS.length) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  }
  const result = {}
  for (const field of COVERAGE_FIELDS) {
    if (typeof value[field] !== 'boolean') throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
    result[field] = value[field]
  }
  return result
}

function normalizeMetadata(value, mediaType) {
  if (value === undefined || value === null) {
    return {
      status: 'missing', genres: [], keywords: [], releaseYear: null, originalLanguage: null,
      countries: [], directors: [], creators: [], actors: [],
      completeness: normalizeCompleteness(),
    }
  }
  if (!isPlainObject(value) || !METADATA_STATUSES.has(value.status)) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  }
  const releaseYear = value.releaseYear ?? null
  if (releaseYear !== null && (!Number.isInteger(releaseYear) || releaseYear < 1800 || releaseYear > 2200)) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  }
  const language = value.originalLanguage ?? null
  if (language !== null && (!isPlainObject(language) || typeof language.code !== 'string'
    || !/^[a-z]{2}$/.test(language.code))) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  }
  const directors = normalizePeople(value.directors, 'director')
  const creators = normalizePeople(value.creators, 'creator')
  if ((mediaType === 'movie' && creators.length) || (mediaType === 'tv' && directors.length)) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  }
  return {
    status: value.status,
    genres: normalizeGenres(value.genres),
    keywords: normalizeKeywords(value.keywords),
    releaseYear,
    originalLanguage: language && {
      key: `language:${language.code}`,
      label: normalizeLabel(language.label, language.code),
      code: language.code,
    },
    countries: normalizeCountries(value.countries),
    directors,
    creators,
    actors: normalizePeople(value.actors, 'actor'),
    completeness: normalizeCompleteness(value.completeness),
  }
}

function normalizeItem(value) {
  if (!isPlainObject(value) || !isPositiveSafeInteger(value.tmdbId) || !MEDIA_TYPES.has(value.mediaType)
    || typeof value.mediaKey !== 'string') {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_INPUT)
  }
  const expectedKey = `${value.mediaType}_${value.tmdbId}`
  if (value.mediaKey !== expectedKey) throwMovieDnaError(MOVIEDNA_ERROR_CODES.MEDIA_IDENTITY_MISMATCH)
  const rating = value.rating ?? null
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 10)) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_RATING)
  }
  const onboardingReaction = value.onboardingReaction ?? null
  if (onboardingReaction !== null && !REACTIONS.has(onboardingReaction)) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_REACTION)
  }
  if (value.favorite !== undefined && typeof value.favorite !== 'boolean') {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_INPUT)
  }
  return {
    mediaKey: value.mediaKey,
    tmdbId: value.tmdbId,
    mediaType: value.mediaType,
    rating,
    onboardingReaction,
    favorite: value.favorite === true,
    metadata: normalizeMetadata(value.metadata, value.mediaType),
  }
}

function effectiveSignal(item) {
  if (item.rating !== null) return { source: 'rating', weight: RATING_WEIGHTS[item.rating] }
  if (item.onboardingReaction === 'like' || item.onboardingReaction === 'dislike') {
    return { source: 'onboarding', weight: ONBOARDING_WEIGHTS[item.onboardingReaction] }
  }
  if (item.favorite) return { source: 'favorite', weight: FAVORITE_WEIGHT }
  if (item.onboardingReaction === 'skip') return { source: 'onboarding', weight: 0 }
  return { source: null, weight: 0 }
}

function genreSpecificityWeight(genre) {
  return GENRE_SPECIFICITY_WEIGHTS[genre.id]
    ?? DEFAULT_GENRE_SPECIFICITY_WEIGHT
}

function genrePairValues(genres) {
  const pairs = []

  for (let leftIndex = 0; leftIndex < genres.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < genres.length; rightIndex += 1) {
      const left = genres[leftIndex]
      const right = genres[rightIndex]

      pairs.push({
        key: `genre-pair:${left.id}+${right.id}`,
        label: `${left.label} + ${right.label}`,
      })
    }
  }

  return pairs
}

function dimensionValues(item) {
  const metadata = item.metadata
  const decade = metadata.releaseYear === null ? [] : [{
    key: `decade:${Math.floor(metadata.releaseYear / 10) * 10}`,
    label: `${Math.floor(metadata.releaseYear / 10) * 10}s`,
  }]
  return {
    genres: metadata.genres,
    specificGenres: metadata.genres,
    genrePairs: genrePairValues(metadata.genres),
    mediaTypes: [{ key: `media:${item.mediaType}`, label: item.mediaType === 'movie' ? 'Movies' : 'TV' }],
    decades: decade,
    languages: metadata.originalLanguage ? [metadata.originalLanguage] : [],
    countries: metadata.countries,
    directors: item.mediaType === 'movie' ? metadata.directors : [],
    creators: item.mediaType === 'tv' ? metadata.creators : [],
    actors: metadata.actors,
  }
}

function createAccumulator() {
  return Object.fromEntries(DIMENSION_NAMES.map((name) => [name, new Map()]))
}

function addContribution(map, value, contribution, mediaKey) {
  const current = map.get(value.key) ?? {
    key: value.key,
    label: value.label,
    signedContribution: 0,
    absoluteEvidenceWeight: 0,
    mediaKeys: new Set(),
  }
  current.signedContribution += contribution
  current.absoluteEvidenceWeight += Math.abs(contribution)
  current.mediaKeys.add(mediaKey)
  map.set(value.key, current)
}

function finalizeDimensions(accumulator) {
  const dimensions = {}
  for (const name of DIMENSION_NAMES) {
    const candidates = [...accumulator[name].values()]
    const denominator = candidates.reduce((sum, value) => sum + value.absoluteEvidenceWeight, 0)
    dimensions[name] = candidates
      .filter((value) => name !== 'actors' || value.mediaKeys.size >= 2)
      .map((value) => {
        const confidence = round(
          Math.min(1, value.absoluteEvidenceWeight / 2)
            * Math.min(1, value.mediaKeys.size / 3),
        )

        const entry = {
          key: value.key,
          label: value.label,
          signedContribution: round(value.signedContribution),
          absoluteEvidenceWeight: round(value.absoluteEvidenceWeight),
          evidenceCount: value.mediaKeys.size,
          score: denominator ? round(value.signedContribution / denominator) : 0,
          confidence,
        }

        if (name === 'specificGenres' || name === 'genrePairs') {
          const affinity = value.absoluteEvidenceWeight
            ? round(value.signedContribution / value.absoluteEvidenceWeight)
            : 0

          const positiveEvidenceWeight = round(
            (value.absoluteEvidenceWeight + value.signedContribution) / 2,
          )

          const negativeEvidenceWeight = round(
            (value.absoluteEvidenceWeight - value.signedContribution) / 2,
          )

          return {
            ...entry,
            affinity,
            positiveEvidenceWeight,
            negativeEvidenceWeight,
            strength: round(affinity * confidence),
          }
        }

        return entry
      })
      .sort((a, b) => b.score - a.score || b.evidenceCount - a.evidenceCount || a.key.localeCompare(b.key))
      .slice(0, name === 'mediaTypes' ? 2 : 20)
  }
  return dimensions
}

function metadataCoverage(items) {
  if (!items.length) return 0
  let covered = 0
  let applicable = 0
  for (const item of items) {
    const completeness = item.metadata.completeness
    for (const field of ['genres', 'releaseYear', 'originalLanguage', 'countries']) {
      applicable += 1
      if (completeness[field]) covered += 1
    }
    applicable += 2
    if (completeness.people) covered += 2
  }
  return round(covered / applicable)
}

function fingerprintPayload(items) {
  return {
    algorithmVersion: MOVIEDNA_ALGORITHM_VERSION,
    calculationRevision: 2,
    items: items.map((item) => ({
      mediaKey: item.mediaKey,
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      rating: item.rating,
      onboardingReaction: item.onboardingReaction,
      favorite: item.favorite,
      metadata: {
        status: item.metadata.status,
        genreIds: item.metadata.genres.map((value) => value.id),
        keywords: item.metadata.keywords.map((value) => ({
          id: value.id,
          name: value.name,
        })),
        releaseYear: item.metadata.releaseYear,
        originalLanguage: item.metadata.originalLanguage?.code ?? null,
        countryCodes: item.metadata.countries.map((value) => value.code),
        directorIds: item.metadata.directors.map((value) => value.id),
        creatorIds: item.metadata.creators.map((value) => value.id),
        actors: item.metadata.actors.map((value) => ({ id: value.id, billingOrder: value.billingOrder })),
        completeness: item.metadata.completeness,
      },
    })),
  }
}

async function sha256(value) {
  if (!globalThis.crypto?.subtle) throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_INPUT)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

export async function calculateMovieDna(input) {
  if (!isPlainObject(input) || !Array.isArray(input.items)) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.INVALID_INPUT)
  }
  const version = input.algorithmVersion ?? MOVIEDNA_ALGORITHM_VERSION
  if (version !== MOVIEDNA_ALGORITHM_VERSION) {
    throwMovieDnaError(MOVIEDNA_ERROR_CODES.UNSUPPORTED_ALGORITHM_VERSION)
  }
  const items = input.items.map(normalizeItem).sort((a, b) => a.mediaKey.localeCompare(b.mediaKey))
  for (let index = 1; index < items.length; index += 1) {
    if (items[index - 1].mediaKey === items[index].mediaKey) {
      throwMovieDnaError(MOVIEDNA_ERROR_CODES.DUPLICATE_SOURCE_ENTRY)
    }
  }

  const sourceCounts = {
    ratingsRead: items.filter((item) => item.rating !== null).length,
    onboardingRead: items.filter((item) => item.onboardingReaction !== null).length,
    favoritesRead: items.filter((item) => item.favorite).length,
    uniqueNonZeroUsed: 0,
    ratingUsed: 0,
    onboardingUsed: 0,
    favoriteUsed: 0,
    neutralOrSkipped: 0,
    shadowedByHigherPriority: 0,
    discardedSourceCount: 0,
    enrichedUsed: 0,
    unavailableMetadata: 0,
  }
  const accumulator = createAccumulator()
  const meaningful = []

  for (const item of items) {
    const signal = effectiveSignal(item)
    const lowerSignals = (item.onboardingReaction === 'like' || item.onboardingReaction === 'dislike' ? 1 : 0)
      + (item.favorite ? 1 : 0)
    if (item.rating !== null) sourceCounts.shadowedByHigherPriority += lowerSignals
    else if ((item.onboardingReaction === 'like' || item.onboardingReaction === 'dislike') && item.favorite) {
      sourceCounts.shadowedByHigherPriority += 1
    }
    if (signal.source && signal.weight === 0) sourceCounts.neutralOrSkipped += 1
    if (!signal.source || signal.weight === 0) continue

    sourceCounts.uniqueNonZeroUsed += 1
    sourceCounts[`${signal.source}Used`] += 1
    meaningful.push(item)
    if (item.metadata.status === 'ready' || item.metadata.status === 'partial') sourceCounts.enrichedUsed += 1
    else sourceCounts.unavailableMetadata += 1

    const values = dimensionValues(item)
    for (const name of DIMENSION_NAMES) {
      const dimension = values[name]
      if (!dimension.length) continue
      if (name === 'specificGenres') {
        const specificityTotal = dimension.reduce(
          (sum, value) => sum + genreSpecificityWeight(value),
          0,
        )

        for (const value of dimension) {
          const contribution = specificityTotal
            ? signal.weight * genreSpecificityWeight(value) / specificityTotal
            : 0

          addContribution(
            accumulator[name],
            value,
            contribution,
            item.mediaKey,
          )
        }

        continue
      }

      const multiplier = name === 'actors' ? ACTOR_WEIGHT_MULTIPLIER : 1
      const contribution = (signal.weight * multiplier) / dimension.length
      for (const value of dimension) addContribution(accumulator[name], value, contribution, item.mediaKey)
    }
  }

  const dimensions = finalizeDimensions(accumulator)
  const coverage = metadataCoverage(meaningful)
  const genreDiversity = dimensions.genres
    .filter((genre) => genre.absoluteEvidenceWeight >= 0.2).length
  const overallConfidence = meaningful.length === 0 ? 0 : round(
    0.6 * Math.min(1, meaningful.length / 20)
    + 0.25 * Math.min(1, genreDiversity / 8)
    + 0.15 * coverage,
  )

  return {
    algorithmVersion: MOVIEDNA_ALGORITHM_VERSION,
    inputFingerprint: await sha256(JSON.stringify(fingerprintPayload(items))),
    sourceCounts,
    metadataCoverage: coverage,
    overallConfidence,
    dimensions,
  }
}
