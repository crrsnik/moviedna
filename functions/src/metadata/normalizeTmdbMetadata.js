import { MovieDnaServerError, SERVER_ERROR_CODES } from '../errors.js'

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}

function year(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = Number(value.slice(0, 4))
  return parsed >= 1800 && parsed <= 2200 ? parsed : null
}

function people(values, maximum, withOrder = false) {
  if (!Array.isArray(values)) return []
  const result = new Map()
  for (const [index, value] of values.entries()) {
    if (!positiveInteger(value?.id) || typeof value.name !== 'string' || !value.name.trim()) continue
    const billingOrder = withOrder && Number.isInteger(value.order) && value.order >= 0 ? value.order : index
    const person = { id: value.id, name: value.name.trim() }
    if (withOrder) person.billingOrder = billingOrder
    const existing = result.get(value.id)
    if (!existing || (withOrder && person.billingOrder < existing.billingOrder)) result.set(value.id, person)
  }
  return [...result.values()]
    .sort((a, b) => withOrder ? a.billingOrder - b.billingOrder || a.id - b.id : a.id - b.id)
    .slice(0, maximum)
}

function keywords(payload) {
  const appended = payload?.keywords

  const values = Array.isArray(appended?.keywords)
    ? appended.keywords
    : Array.isArray(appended?.results)
      ? appended.results
      : []

  const unique = new Map()

  for (const value of values) {
    if (
      !positiveInteger(value?.id)
      || typeof value.name !== 'string'
    ) {
      continue
    }

    const name = value.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')

    if (!name || name.length > 100) continue

    if (!unique.has(value.id)) {
      unique.set(value.id, {
        id: value.id,
        name,
      })
    }
  }

  return [...unique.values()]
    .sort((a, b) => (
      a.id - b.id
      || a.name.localeCompare(b.name)
    ))
    .slice(0, 100)
}

function baseMetadata(payload, mediaType) {
  if (!payload || !positiveInteger(payload.id)) {
    throw new MovieDnaServerError(SERVER_ERROR_CODES.INVALID_METADATA)
  }
  const genreIds = [...new Set((Array.isArray(payload.genres) ? payload.genres : [])
    .map((genre) => genre?.id).filter(positiveInteger))].sort((a, b) => a - b).slice(0, 20)
  const originalLanguage = typeof payload.original_language === 'string'
    && /^[a-z]{2}$/.test(payload.original_language) ? payload.original_language : null
  const countryCodes = [...new Set((Array.isArray(payload.production_countries)
    ? payload.production_countries : [])
    .map((country) => country?.iso_3166_1).filter((code) => typeof code === 'string' && /^[A-Z]{2}$/.test(code)))]
    .sort().slice(0, 20)
  return {
    schemaVersion: 1,
    tmdbId: payload.id,
    mediaType,
    genreIds,
    keywords: keywords(payload),
    releaseYear: year(mediaType === 'movie' ? payload.release_date : payload.first_air_date),
    originalLanguage,
    countryCodes,
  }
}

export function normalizeMovieMetadata(payload) {
  const result = baseMetadata(payload, 'movie')
  const crew = Array.isArray(payload.credits?.crew) ? payload.credits.crew : []
  const collectionId = positiveInteger(
    payload.belongs_to_collection?.id,
  )
    ? payload.belongs_to_collection.id
    : null
  return {
    ...result,
    ...(collectionId === null
      ? {}
      : { collectionId }),
    directors: people(crew.filter((member) => member?.job === 'Director'), 10),
    creators: [],
    actors: people(payload.credits?.cast, 3, true),
    metadataStatus: 'ready',
    metadataCompleteness: {
      genres: Array.isArray(payload.genres),
      releaseYear: result.releaseYear !== null,
      originalLanguage: result.originalLanguage !== null,
      countries: Array.isArray(payload.production_countries),
      people: Array.isArray(payload.credits?.crew) && Array.isArray(payload.credits?.cast),
    },
  }
}
export function normalizeTvMetadata(payload) {
  const result = baseMetadata(payload, 'tv')
  const cast = payload.aggregate_credits?.cast ?? payload.credits?.cast
  return {
    ...result,
    directors: [],
    creators: people(payload.created_by, 10),
    actors: people(cast, 3, true),
    metadataStatus: 'ready',
    metadataCompleteness: {
      genres: Array.isArray(payload.genres),
      releaseYear: result.releaseYear !== null,
      originalLanguage: result.originalLanguage !== null,
      countries: Array.isArray(payload.production_countries),
      people: Array.isArray(payload.created_by) && Array.isArray(cast),
    },
  }
}
