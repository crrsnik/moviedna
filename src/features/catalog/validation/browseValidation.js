import { normalizePage } from './searchValidation.js'

export const BROWSE_VIEWS = {
  movie: { popular: 'Popular', 'top-rated': 'Top Rated', 'now-playing': 'Now Playing', upcoming: 'Upcoming' },
  tv: { popular: 'Popular', 'top-rated': 'Top Rated', 'airing-today': 'Airing Today', 'on-the-air': 'On The Air' },
  person: { popular: 'Popular', trending: 'Trending This Week' },
}
export const BROWSE_ENDPOINTS = {
  movie: { popular: '/movie/popular', 'top-rated': '/movie/top_rated', 'now-playing': '/movie/now_playing', upcoming: '/movie/upcoming' },
  tv: { popular: '/tv/popular', 'top-rated': '/tv/top_rated', 'airing-today': '/tv/airing_today', 'on-the-air': '/tv/on_the_air' },
  person: { popular: '/person/popular', trending: '/trending/person/week' },
}
export function normalizeGenre(value) {
  const text = typeof value === 'number' ? String(value) : value
  return typeof text === 'string' && /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : null
}
export function normalizeBrowse(type, { view, genre, page } = {}) {
  genre = type === 'person' ? null : normalizeGenre(genre)
  return { view: genre ? null : Object.hasOwn(BROWSE_VIEWS[type], view) ? view : 'popular', genre, page: normalizePage(page) }
}
export function readBrowseParams(type, params) {
  return normalizeBrowse(type, { view: params.get('view'), genre: params.get('genre'), page: params.get('page') })
}
export function createBrowseParams(type, value) {
  const { view, genre, page } = normalizeBrowse(type, value)
  return new URLSearchParams({ ...(genre ? { genre: String(genre) } : { view }), page: String(page) })
}
export function changeBrowse(type, current, patch) {
  const next = { ...current, ...patch }
  if (Object.hasOwn(patch, 'view')) { next.genre = null; next.page = 1 }
  if (Object.hasOwn(patch, 'genre')) { next.view = 'popular'; next.page = 1 }
  return createBrowseParams(type, next)
}
export function isBrowsePath(path) {
  return Object.values(BROWSE_ENDPOINTS).some((views) => Object.values(views).includes(path))
    || ['/genre/movie/list', '/genre/tv/list', '/discover/movie', '/discover/tv'].includes(path)
}
// Exact allowlist shared by client and proxy. List endpoints do not receive discover parameters.
export function isAllowedBrowseRequest(url) {
  const path = url.pathname.replace(/^\/api\/tmdb/, '')
  if (!url.pathname.startsWith('/api/tmdb/') || !isBrowsePath(path)) return false
  const p = url.searchParams
  let keys = ['language']
  if (!path.startsWith('/genre/')) keys.push('page')
  if (path.startsWith('/discover/')) keys.push('sort_by', 'include_adult', 'with_genres', path.endsWith('/movie') ? 'include_video' : 'include_null_first_air_dates')
  if ([...p].length !== keys.length || !keys.every((key) => p.getAll(key).length === 1) || p.get('language') !== 'en-US') return false
  if (keys.includes('page') && String(normalizePage(p.get('page'))) !== p.get('page')) return false
  return !path.startsWith('/discover/') || (p.get('sort_by') === 'popularity.desc' && p.get('include_adult') === 'false'
    && normalizeGenre(p.get('with_genres')) !== null && p.get(keys.at(-1)) === 'false')
}
