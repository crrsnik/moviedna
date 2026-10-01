import { getMediaKey, normalizeMediaSnapshot } from '../validation/libraryValidation.js'
import { LibraryError } from './libraryErrors.js'

const requiredFields = ['tmdbId', 'mediaType', 'title', 'posterPath', 'releaseYear', 'favorite', 'watchlist', 'listIds', 'createdAt', 'updatedAt']
const allowedFields = [...requiredFields, 'watched']

export function normalizeLibraryTimestamp(value) {
  if (!value || !Number.isInteger(value.seconds) || value.seconds < -62135596800 || value.seconds > 253402300799
    || !Number.isInteger(value.nanoseconds) || value.nanoseconds < 0 || value.nanoseconds > 999999999 || typeof value.toMillis !== 'function') throw new LibraryError('invalid-data')
  return { seconds: value.seconds, nanoseconds: value.nanoseconds }
}

export function normalizeSavedMedia(snapshot) {
  try {
    const data = snapshot.data()
    const keys = data && typeof data === 'object' ? Object.keys(data) : []

    if (!data
      || !requiredFields.every(field => Object.hasOwn(data, field))
      || !keys.every(field => allowedFields.includes(field))
      || snapshot.id !== getMediaKey(data.mediaType, data.tmdbId)) throw new Error()

    const media = normalizeMediaSnapshot(data)
    const watched = Object.hasOwn(data, 'watched') ? data.watched : false

    if (typeof data.title !== 'string' || data.title.length > 200 || media.posterPath !== data.posterPath || media.releaseYear !== data.releaseYear || typeof data.favorite !== 'boolean' || typeof data.watchlist !== 'boolean'
      || typeof watched !== 'boolean'
      || !Array.isArray(data.listIds) || data.listIds.length > 20 || new Set(data.listIds).size !== data.listIds.length
      || !data.listIds.every(id => typeof id === 'string' && /^[A-Za-z0-9]{20}$/.test(id))
      || !(data.favorite || data.watchlist || watched || data.listIds.length)) throw new Error()

    return {
      ...media,
      key: snapshot.id,
      favorite: data.favorite,
      watchlist: data.watchlist,
      watched,
      listIds: [...data.listIds],
      createdAt: normalizeLibraryTimestamp(data.createdAt),
      updatedAt: normalizeLibraryTimestamp(data.updatedAt),
    }
  } catch {
    throw new LibraryError('invalid-data')
  }
}

const compareTime = (a, b) => b.seconds - a.seconds || b.nanoseconds - a.nanoseconds

export function normalizeLibraryItems(snapshot) {
  return snapshot.docs.flatMap(doc => { try { return [normalizeSavedMedia(doc)] } catch { return [] } })
    .sort((a, b) => compareTime(a.updatedAt, b.updatedAt) || compareTime(a.createdAt, b.createdAt) || a.title.localeCompare(b.title, 'en') || a.key.localeCompare(b.key))
}
