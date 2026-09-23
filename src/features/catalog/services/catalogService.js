import { getTmdb } from './tmdbClient.js'
import { TmdbError } from './tmdbErrors.js'
import { isTmdbImagePath } from './tmdbImages.js'

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null
}

export function normalizeMedia(item, mediaType) {
  if (!item || !Number.isSafeInteger(item.id) || item.id <= 0
    || (item.media_type !== undefined && item.media_type !== mediaType)) return null
  const title = mediaType === 'movie' ? item.title : item.name
  if (typeof title !== 'string' || !title.trim()) return null
  return {
    id: item.id, mediaType, title: title.trim(),
    overview: typeof item.overview === 'string' ? item.overview : '',
    posterPath: isTmdbImagePath(item.poster_path) ? item.poster_path : null,
    backdropPath: isTmdbImagePath(item.backdrop_path) ? item.backdrop_path : null,
    releaseDate: validDate(mediaType === 'movie' ? item.release_date : item.first_air_date),
    voteAverage: Number.isFinite(item.vote_average) && item.vote_average >= 0 && item.vote_average <= 10 ? item.vote_average : null,
    voteCount: Number.isSafeInteger(item.vote_count) && item.vote_count >= 0 ? item.vote_count : 0,
    genreIds: Array.isArray(item.genre_ids) ? [...new Set(item.genre_ids.filter((id) => Number.isSafeInteger(id) && id > 0))] : [],
    popularity: Number.isFinite(item.popularity) && item.popularity >= 0 ? item.popularity : 0,
  }
}

async function getTrending(mediaType, options) {
  const data = await getTmdb(`/trending/${mediaType}/day`, options)
  if (!data || !Array.isArray(data.results)) throw new TmdbError('invalid')
  const seen = new Set()
  return data.results.map((item) => normalizeMedia(item, mediaType)).filter((item) => {
    if (!item || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function getTrendingMovies(options = {}) {
  return getTrending('movie', options)
}

export function getTrendingTvShows(options = {}) {
  return getTrending('tv', options)
}
