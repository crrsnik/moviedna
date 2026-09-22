export const SEARCH_TYPES = ['all', 'movie', 'tv', 'person']
export const MAX_SEARCH_PAGE = 500
export function normalizeQuery(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : ''
}
export function getQueryError(query) {
  const value = normalizeQuery(query)
  return value.length < 2 ? 'Enter at least 2 characters.' : value.length > 100 ? 'Use no more than 100 characters.' : null
}
export function normalizeType(type) { return SEARCH_TYPES.includes(type) ? type : 'all' }
export function normalizePage(page) {
  const value = typeof page === 'number' ? String(page) : page
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number(value) <= MAX_SEARCH_PAGE ? Number(value) : 1
}
export function readSearchParams(params) {
  return { query: normalizeQuery(params.get('q')), type: normalizeType(params.get('type')), page: normalizePage(params.get('page')) }
}
export function createSearchParams({ query, type = 'all', page = 1 }) {
  return new URLSearchParams({ q: normalizeQuery(query), type: normalizeType(type), page: String(normalizePage(page)) })
}
export function changeSearch(current, patch) {
  const next = { ...current, ...patch }
  if (normalizeQuery(next.query) !== current.query || normalizeType(next.type) !== current.type) next.page = 1
  return createSearchParams(next)
}
export function getPagination(page, totalPages) {
  const last = Number.isSafeInteger(totalPages) ? Math.max(1, Math.min(MAX_SEARCH_PAGE, totalPages)) : 1
  const current = Math.min(normalizePage(page), last)
  return { page: current, totalPages: last, previous: current > 1 ? current - 1 : null, next: current < last ? current + 1 : null }
}
// Shared with the local proxy: no arbitrary parameters or adult-enabled searches.
export function isAllowedSearchRequest(url) {
  const params = url.searchParams
  return /^\/api\/tmdb\/search\/(multi|movie|tv|person)$/.test(url.pathname)
    && [...params].length === 4
    && ['query', 'language', 'page', 'include_adult'].every((key) => params.getAll(key).length === 1)
    && !getQueryError(params.get('query'))
    && params.get('query') === normalizeQuery(params.get('query'))
    && params.get('language') === 'en-US' && params.get('include_adult') === 'false'
    && String(normalizePage(params.get('page'))) === params.get('page')
}
