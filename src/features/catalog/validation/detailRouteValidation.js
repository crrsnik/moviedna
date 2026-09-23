export const MOVIE_DETAIL_APPEND = 'credits,videos,release_dates,recommendations'
export function isValidMovieId(value) {
  const text = typeof value === 'number' ? String(value) : value
  return typeof text === 'string' && /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text))
}
export function isMovieDetailPath(path) {
  return typeof path === 'string' && /^\/movie\/[1-9]\d*$/.test(path) && isValidMovieId(path.slice(7))
}
export function isAllowedMovieDetailRequest(url) {
  const path = url.pathname.replace(/^\/api\/tmdb/, '')
  const p = url.searchParams
  return url.pathname.startsWith('/api/tmdb/') && isMovieDetailPath(path)
    && [...p].length === 2 && p.getAll('language').length === 1 && p.get('language') === 'en-US'
    && p.getAll('append_to_response').length === 1 && p.get('append_to_response') === MOVIE_DETAIL_APPEND
}
