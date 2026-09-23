export const MOVIE_DETAIL_APPEND = 'credits,videos,release_dates,recommendations'
export function isValidDetailId(value) {
  const text = typeof value === 'number' ? String(value) : value
  return typeof text === 'string' && /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text))
}
export const isValidMovieId = isValidDetailId
export const isValidSeriesId = isValidDetailId
export const TV_DETAIL_APPEND = 'aggregate_credits,videos,content_ratings,recommendations'
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

export function isTvDetailPath(path) {
  return typeof path === 'string' && /^\/tv\/[1-9]\d*$/.test(path) && isValidSeriesId(path.slice(4))
}
export function isAllowedTvDetailRequest(url) {
  const path = url.pathname.replace(/^\/api\/tmdb/, '')
  const p = url.searchParams
  return url.pathname.startsWith('/api/tmdb/') && isTvDetailPath(path)
    && [...p].length === 2 && p.getAll('language').length === 1 && p.get('language') === 'en-US'
    && p.getAll('append_to_response').length === 1 && p.get('append_to_response') === TV_DETAIL_APPEND
}
