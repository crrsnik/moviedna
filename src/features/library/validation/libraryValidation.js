import { isTmdbImagePath } from '../../catalog/services/tmdbImages.js'
import { LibraryError } from '../services/libraryErrors.js'
export function getMediaKey(mediaType, tmdbId) {
  if (!['movie', 'tv'].includes(mediaType) || !Number.isSafeInteger(tmdbId) || tmdbId < 1 || tmdbId > 999999999999) throw new LibraryError('invalid-media')
  return `${mediaType}_${tmdbId}`
}
export function normalizeLibraryView(view) { return view === 'watchlist' ? 'watchlist' : 'favorites' }
export function libraryViewParams(view) { return new URLSearchParams({ view: normalizeLibraryView(view) }) }
export function normalizeMediaSnapshot(input) {
  getMediaKey(input?.mediaType, input?.tmdbId)
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title || title.length > 200) throw new LibraryError('invalid-media')
  return { tmdbId: input.tmdbId, mediaType: input.mediaType, title,
    posterPath: isTmdbImagePath(input.posterPath) && input.posterPath.length <= 200 ? input.posterPath : null,
    releaseYear: Number.isInteger(input.releaseYear) && input.releaseYear >= 1800 && input.releaseYear <= 2200 ? input.releaseYear : null }
}
export function detailToSnapshot(mediaType, detail) {
  const date = mediaType === 'movie' ? detail?.releaseDate : detail?.firstAirDate
  return normalizeMediaSnapshot({ tmdbId: detail?.id, mediaType, title: mediaType === 'movie' ? detail?.title : detail?.name,
    posterPath: detail?.posterPath, releaseYear: typeof date === 'string' && /^\d{4}-/.test(date) ? Number(date.slice(0, 4)) : null })
}
export function savedMediaRoute(item) {
  getMediaKey(item?.mediaType, item?.tmdbId)
  return `/${item.mediaType === 'movie' ? 'movies' : 'tv'}/${item.tmdbId}`
}
