import { getMediaKey } from '../../library/validation/libraryValidation.js'
import { normalizeLibraryTimestamp } from '../../library/services/normalizeSavedMedia.js'
import { ratingMediaSnapshot, validateScore } from '../validation/ratingValidation.js'
import { RatingError } from './ratingErrors.js'
const fields = ['tmdbId', 'mediaType', 'title', 'posterPath', 'releaseYear', 'score', 'createdAt', 'updatedAt']
export function normalizeRating(snapshot) {
  try {
    const raw = snapshot.data()
    if (!raw || Object.keys(raw).length !== fields.length || !fields.every(key => Object.hasOwn(raw, key))) throw new Error()
    const media = ratingMediaSnapshot(raw)
    if (snapshot.id !== getMediaKey(media.mediaType, media.tmdbId)) throw new RatingError('identity-mismatch')
    if (raw.title.length > 200 || raw.posterPath !== media.posterPath || raw.releaseYear !== media.releaseYear) throw new Error()
    return { ...media, key: snapshot.id, score: validateScore(raw.score), createdAt: normalizeLibraryTimestamp(raw.createdAt), updatedAt: normalizeLibraryTimestamp(raw.updatedAt) }
  } catch (error) {
    if (error?.code === 'identity-mismatch') throw error
    throw new RatingError('corrupted-rating')
  }
}
const newest = (a, b) => b.seconds - a.seconds || b.nanoseconds - a.nanoseconds
export function normalizeUserRatings(snapshot) {
  return snapshot.docs.flatMap(doc => { try { return [normalizeRating(doc)] } catch { return [] } })
    .sort((a, b) => newest(a.updatedAt, b.updatedAt) || newest(a.createdAt, b.createdAt) || a.title.localeCompare(b.title, 'en') || a.key.localeCompare(b.key))
}
