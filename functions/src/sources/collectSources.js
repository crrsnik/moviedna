import { MAX_SOURCE_ITEMS } from '../config.js'
import { MovieDnaServerError, SERVER_ERROR_CODES } from '../errors.js'

const MEDIA_KEY_PATTERN = /^(movie|tv)_([1-9][0-9]{0,11})$/

function identity(document, fallbackMediaType) {
  const providedMediaKey = document.mediaKey
  const providedMatch = typeof providedMediaKey === 'string'
    ? providedMediaKey.match(MEDIA_KEY_PATTERN)
    : null

  const mediaType = document.mediaType
    ?? fallbackMediaType
    ?? providedMatch?.[1]

  const tmdbId = document.tmdbId
    ?? (providedMatch ? Number(providedMatch[2]) : undefined)

  const mediaKey = providedMediaKey ?? `${mediaType}_${tmdbId}`
  const match = typeof mediaKey === 'string'
    ? mediaKey.match(MEDIA_KEY_PATTERN)
    : null

  if (!match || !Number.isSafeInteger(tmdbId) || tmdbId <= 0
    || mediaType !== match[1] || String(tmdbId) !== match[2]) {
    throw new MovieDnaServerError(SERVER_ERROR_CODES.INVALID_SOURCE)
  }

  return { mediaKey, mediaType, tmdbId }
}

function ensureUniqueDocuments(documents) {
  const ids = new Set()
  for (const document of documents) {
    if (!document || typeof document !== 'object' || typeof document.id !== 'string' || ids.has(document.id)) {
      throw new MovieDnaServerError(SERVER_ERROR_CODES.INVALID_SOURCE)
    }
    ids.add(document.id)
  }
  return documents.map(({ id, ...data }) => ({ id, data }))
}

export function collectDnaSources(snapshot, maximum = MAX_SOURCE_ITEMS) {
  if (!snapshot?.profile || typeof snapshot.uid !== 'string'
    || typeof snapshot.profile.username !== 'string'
    || !/^[a-z0-9_]{3,20}$/.test(snapshot.profile.username)
    || typeof snapshot.profile.displayName !== 'string'
    || !snapshot.profile.displayName.trim()
    || snapshot.profile.displayName.length > 50
    || typeof snapshot.profile.onboardingCompleted !== 'boolean') {
    throw new MovieDnaServerError(SERVER_ERROR_CODES.INVALID_PROFILE)
  }
  const ratings = ensureUniqueDocuments(snapshot.ratings ?? [])
  const responses = ensureUniqueDocuments(snapshot.onboardingResponses ?? [])
  const savedMedia = ensureUniqueDocuments(snapshot.savedMedia ?? [])
  const count = ratings.length + responses.length
    + savedMedia.filter(({ data }) => data.favorite === true).length
  if (count > maximum) throw new MovieDnaServerError(SERVER_ERROR_CODES.SOURCE_LIMIT_EXCEEDED)

  const items = new Map()
  function upsert(document, fallbackType, apply) {
    const nextIdentity = identity(document, fallbackType)
    const current = items.get(nextIdentity.mediaKey)
    if (current && (current.tmdbId !== nextIdentity.tmdbId || current.mediaType !== nextIdentity.mediaType)) {
      throw new MovieDnaServerError(SERVER_ERROR_CODES.IDENTITY_CONFLICT)
    }
    const item = current ?? {
      ...nextIdentity,
      rating: null,
      onboardingReaction: null,
      favorite: false,
      metadata: null,
    }
    apply(item)
    items.set(item.mediaKey, item)
  }

  for (const { id, data } of ratings) {
    upsert({ ...data, mediaKey: id }, undefined, (item) => {
      if (!Number.isInteger(data.score) || data.score < 1 || data.score > 10) {
        throw new MovieDnaServerError(SERVER_ERROR_CODES.INVALID_SOURCE)
      }
      item.rating = data.score
    })
  }
  const responseMediaKeys = new Set()

  for (const { id, data } of responses) {
    const legacyMovieId = /^[1-9][0-9]{0,11}$/.test(id)
    const mediaKey = legacyMovieId
      ? `movie_${id}`
      : id

    if (
      legacyMovieId
      && (
        (
          data.mediaType !== undefined
          && data.mediaType !== 'movie'
        )
        || (
          data.tmdbId !== undefined
          && String(data.tmdbId) !== id
        )
      )
    ) {
      throw new MovieDnaServerError(
        SERVER_ERROR_CODES.INVALID_SOURCE,
      )
    }

    if (responseMediaKeys.has(mediaKey)) {
      throw new MovieDnaServerError(
        SERVER_ERROR_CODES.INVALID_SOURCE,
      )
    }

    responseMediaKeys.add(mediaKey)

    upsert(
      {
        ...data,
        mediaKey,
      },
      undefined,
      (item) => {
        if (
          !['like', 'dislike', 'skip'].includes(
            data.reaction,
          )
        ) {
          throw new MovieDnaServerError(
            SERVER_ERROR_CODES.INVALID_SOURCE,
          )
        }

        item.onboardingReaction = data.reaction
      },
    )
  }

  for (const { id, data } of savedMedia) {
    if (data.favorite !== true) continue
    upsert({ ...data, mediaKey: id }, undefined, (item) => { item.favorite = true })
  }

  return [...items.values()].sort((a, b) => a.mediaKey.localeCompare(b.mediaKey))
}
