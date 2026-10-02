const SEARCH_PATHS = new Set(['/search/multi', '/search/movie', '/search/tv', '/search/person'])
const LIST_PATHS = new Set([
  '/trending/movie/day', '/trending/tv/day',
  '/movie/popular', '/movie/top_rated', '/movie/now_playing', '/movie/upcoming',
  '/tv/popular', '/tv/top_rated', '/tv/airing_today', '/tv/on_the_air',
  '/person/popular', '/trending/person/week',
])
const GENRE_PATHS = new Set(['/genre/movie/list', '/genre/tv/list'])
const DETAIL_APPEND = Object.freeze({
  movie: 'credits,videos,release_dates,recommendations',
  tv: 'aggregate_credits,videos,content_ratings,recommendations',
  person: 'combined_credits,images,external_ids',
})
const MAX_PAGE = 500

const ALLOWED_LANGUAGES = new Set([
  'en-US',
  'fr-FR',
  'ru-RU',
])

function validLanguage(value) {
  return ALLOWED_LANGUAGES.has(value)
}

function exactParameters(params, expected) {
  return [...params].length === expected.length
    && expected.every((key) => params.getAll(key).length === 1)
}

function validPage(value) {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number(value) <= MAX_PAGE
}

function validPositiveId(value) {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
}

function normalizedQuery(value) {
  return typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : ''
}

function responseKind(path) {
  return GENRE_PATHS.has(path) ? 'genres' : /^\/(movie|tv|person)\/[1-9]\d*$/.test(path) ? 'detail' : 'results'
}

export function validateTmdbProxyRequest(rawUrl, method = 'GET') {
  if (method !== 'GET' || typeof rawUrl !== 'string' || rawUrl.includes('#')) return null
  const rawPath = rawUrl.split('?')[0]
  if (!/^\/api\/tmdb\/[A-Za-z0-9_/-]+$/.test(rawPath)
    || rawPath.includes('//') || rawPath.includes('/./') || rawPath.includes('/../')) return null
  let url
  try {
    url = new URL(rawUrl, 'https://moviedna.invalid')
  } catch {
    return null
  }
  if (url.origin !== 'https://moviedna.invalid' || !url.pathname.startsWith('/api/tmdb/')) return null
  const path = url.pathname.slice('/api/tmdb'.length)
  const params = url.searchParams

  if (LIST_PATHS.has(path)) {
    const trending = path.startsWith('/trending/movie/') || path.startsWith('/trending/tv/')
    const expected = trending ? ['language'] : ['language', 'page']
    if (!exactParameters(params, expected) || !validLanguage(params.get('language'))
      || (!trending && !validPage(params.get('page')))) return null
  } else if (SEARCH_PATHS.has(path)) {
    const query = params.get('query')
    if (!exactParameters(params, ['query', 'language', 'page', 'include_adult'])
      || normalizedQuery(query) !== query || query.length < 2 || query.length > 100
      || !validLanguage(params.get('language')) || !validPage(params.get('page'))
      || params.get('include_adult') !== 'false') return null
  } else if (GENRE_PATHS.has(path)) {
    if (!exactParameters(params, ['language']) || !validLanguage(params.get('language'))) return null
  } else if (path === '/discover/movie' || path === '/discover/tv') {
    const tail = path === '/discover/movie' ? 'include_video' : 'include_null_first_air_dates'
    const expected = ['language', 'page', 'sort_by', 'include_adult', 'with_genres', tail]
    if (!exactParameters(params, expected) || !validLanguage(params.get('language'))
      || !validPage(params.get('page')) || params.get('sort_by') !== 'popularity.desc'
      || params.get('include_adult') !== 'false' || !validPositiveId(params.get('with_genres'))
      || params.get(tail) !== 'false') return null
  } else {
    const match = path.match(/^\/(movie|tv|person)\/([^/]+)$/)
    if (!match || !validPositiveId(match[2])
      || !exactParameters(params, ['language', 'append_to_response'])
      || !validLanguage(params.get('language'))
      || params.get('append_to_response') !== DETAIL_APPEND[match[1]]) return null
  }

  return { path, query: new URLSearchParams(params), responseKind: responseKind(path) }
}

export function isExpectedTmdbPayload(payload, kind) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  if (kind === 'genres') return Array.isArray(payload.genres)
  if (kind === 'detail') return Number.isSafeInteger(payload.id) && payload.id > 0
  return Array.isArray(payload.results)
}
