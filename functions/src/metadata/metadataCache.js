import { MAX_TMDB_CONCURRENCY, MEDIA_CACHE_TTL_MS } from '../config.js'
import { MovieDnaServerError, SERVER_ERROR_CODES } from '../errors.js'

function validIdentity(entry, item) {
  return entry?.schemaVersion === 1
    && entry.tmdbId === item.tmdbId
    && entry.mediaType === item.mediaType
    && Array.isArray(entry.keywords)
    && Object.prototype.hasOwnProperty.call(
      entry,
      'collectionId',
    )
}

function toCoreMetadata(entry) {
  if (!entry || !['ready', 'partial', 'missing', 'temporary-error'].includes(entry.metadataStatus)) {
    throw new MovieDnaServerError(SERVER_ERROR_CODES.INVALID_METADATA)
  }
  return {
    status: entry.metadataStatus,
    genres: (entry.genreIds ?? []).map((id) => ({ id, label: String(id) })),
    keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
    releaseYear: entry.releaseYear ?? null,
    originalLanguage: entry.originalLanguage
      ? { code: entry.originalLanguage, label: entry.originalLanguage }
      : null,
    countries: (entry.countryCodes ?? []).map((code) => ({ code, label: code })),
    directors: entry.directors ?? [],
    creators: entry.creators ?? [],
    actors: entry.actors ?? [],
    ...(Number.isSafeInteger(entry.collectionId)
      && entry.collectionId > 0
      ? { collectionId: entry.collectionId }
      : {}),
    completeness: entry.metadataCompleteness ?? {
      genres: false, releaseYear: false, originalLanguage: false, countries: false, people: false,
    },
  }
}

function missingEntry(item) {
  return {
    schemaVersion: 1,
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
    genreIds: [], keywords: [], releaseYear: null, originalLanguage: null, countryCodes: [],
    directors: [], creators: [], actors: [],
    metadataStatus: 'missing',
    metadataCompleteness: {
      genres: false, releaseYear: false, originalLanguage: false, countries: false, people: false,
    },
  }
}

export function createMetadataResolver({ cache, tmdbClient, now = () => Date.now(), ttlMs = MEDIA_CACHE_TTL_MS }) {
  async function resolveOne(item) {
    const existing = await cache.get(item.mediaKey)
    const compatible = validIdentity(existing, item)
    const currentTime = now()
    const validExpiry = Number.isFinite(existing?.expiresAt) && existing.expiresAt > currentTime
    if (compatible && validExpiry) return toCoreMetadata(existing)

    const fetched = await tmdbClient.getMetadata(item.mediaType, item.tmdbId)
    const normalized = fetched ?? missingEntry(item)
    const writtenAt = now()
    const stored = {
      ...normalized,
      collectionId:
        normalized.collectionId ?? null,
      fetchedAt: writtenAt,
      expiresAt: writtenAt + ttlMs,
    }
    await cache.set(item.mediaKey, stored)
    return toCoreMetadata(stored)
  }

  async function resolve(items) {
    const result = new Array(items.length)
    let cursor = 0
    async function worker() {
      while (cursor < items.length) {
        const index = cursor
        cursor += 1
        result[index] = { ...items[index], metadata: await resolveOne(items[index]) }
      }
    }
    await Promise.all(Array.from({ length: Math.min(MAX_TMDB_CONCURRENCY, items.length) }, worker))
    return result
  }

  return { resolve }
}
