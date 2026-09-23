import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '../../../shared/config/tmdb.js'

export function isTmdbImagePath(path) {
  return typeof path === 'string' && /^\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(path)
}

export function getTmdbPosterUrl(path, size = 'w342') {
  if (!isTmdbImagePath(path) || !TMDB_POSTER_SIZES.includes(size)) return null
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

export function getTmdbProfileUrl(path, size = 'w185') {
  if (!isTmdbImagePath(path) || !['w45', 'w185', 'h632', 'original'].includes(size)) return null
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

export function getTmdbBackdropUrl(path, size = 'w1280') {
  if (!isTmdbImagePath(path) || !['w300', 'w780', 'w1280', 'original'].includes(size)) return null
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}
