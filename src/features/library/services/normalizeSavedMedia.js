import { getMediaKey, normalizeMediaSnapshot } from '../validation/libraryValidation.js'
import { LibraryError } from './libraryErrors.js'
const fields = ['tmdbId', 'mediaType', 'title', 'posterPath', 'releaseYear', 'favorite', 'watchlist', 'listIds', 'createdAt', 'updatedAt']
function time(value) {
  if (!value || !Number.isInteger(value.seconds) || value.seconds < -62135596800 || value.seconds > 253402300799
    || !Number.isInteger(value.nanoseconds) || value.nanoseconds < 0 || value.nanoseconds > 999999999 || typeof value.toMillis !== 'function') throw new LibraryError('invalid-data')
  return { seconds: value.seconds, nanoseconds: value.nanoseconds }
}
export function normalizeSavedMedia(snapshot) {
  try {
    const data = snapshot.data()
    if (!data || Object.keys(data).length !== fields.length || !fields.every(f => Object.hasOwn(data, f))
      || snapshot.id !== getMediaKey(data.mediaType, data.tmdbId)) throw new Error()
    const media = normalizeMediaSnapshot(data)
    if (typeof data.title !== 'string' || data.title.length > 200 || media.posterPath !== data.posterPath || media.releaseYear !== data.releaseYear || typeof data.favorite !== 'boolean' || typeof data.watchlist !== 'boolean'
      || !Array.isArray(data.listIds) || data.listIds.length > 20 || new Set(data.listIds).size !== data.listIds.length
      || !data.listIds.every(id => typeof id === 'string' && /^[A-Za-z0-9]{20}$/.test(id))
      || !(data.favorite || data.watchlist || data.listIds.length)) throw new Error()
    return { ...media, key: snapshot.id, favorite: data.favorite, watchlist: data.watchlist, listIds: [...data.listIds], createdAt: time(data.createdAt), updatedAt: time(data.updatedAt) }
  } catch { throw new LibraryError('invalid-data') }
}
const compareTime = (a, b) => b.seconds - a.seconds || b.nanoseconds - a.nanoseconds
export function normalizeLibraryItems(snapshot) {
  return snapshot.docs.flatMap(doc => { try { return [normalizeSavedMedia(doc)] } catch { return [] } })
    .sort((a, b) => compareTime(a.updatedAt, b.updatedAt) || compareTime(a.createdAt, b.createdAt) || a.title.localeCompare(b.title, 'en') || a.key.localeCompare(b.key))
}
