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

const TOP_RATED_MIN_VOTES = Object.freeze({
  movie: '500',
  tv: '200',
})

const TOP_RATED_MIN_AVERAGE = Object.freeze({
  movie: '7',
  tv: '7.5',
})

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

function validGenres(value) {
  if (
    typeof value !== 'string'
    || !/^[1-9]\d*(?:,[1-9]\d*)*$/.test(value)
  ) {
    return false
  }

  const ids = value.split(',')

  return (
    ids.length <= 20
    && new Set(ids).size === ids.length
    && ids.every(validPositiveId)
  )
}

function validCountry(value) {
  return (
    typeof value === 'string'
    && /^[A-Z]{2}$/.test(value)
  )
}

function validIsoDate(value) {
  if (
    typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value
  )
}

function allowedParameters(
  params,
  required,
  optional = [],
) {
  const allowed = new Set([
    ...required,
    ...optional,
  ])

  return (
    required.every(
      key => params.getAll(key).length === 1,
    )
    && [...params.keys()].every(
      key => (
        allowed.has(key)
        && params.getAll(key).length === 1
      ),
    )
  )
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
  } else if (
    path === '/discover/movie'
    || path === '/discover/tv'
  ) {
    const movie = path === '/discover/movie'

    const tail = movie
      ? 'include_video'
      : 'include_null_first_air_dates'

    const required = [
      'language',
      'page',
      'sort_by',
      'include_adult',
      tail,
    ]

    const dateKeys = movie
      ? [
          'primary_release_date.gte',
          'primary_release_date.lte',
        ]
      : [
          'air_date.gte',
          'air_date.lte',
        ]

    const optional = [
      'with_genres',
      'with_origin_country',
      'vote_count.gte',
      'vote_average.gte',
      ...dateKeys,
    ]

    const allowedSorts = movie
      ? new Set([
          'popularity.desc',
          'vote_average.desc',
          'vote_count.desc',
          'primary_release_date.asc',
        ])
      : new Set([
          'popularity.desc',
          'vote_average.desc',
          'vote_count.desc',
        ])

    if (
      !allowedParameters(
        params,
        required,
        optional,
      )
      || !validLanguage(
        params.get('language'),
      )
      || !validPage(
        params.get('page'),
      )
      || !allowedSorts.has(
        params.get('sort_by'),
      )
      || (
        params.get('sort_by')
          === 'vote_average.desc'
          ? params.get('vote_count.gte')
            !== TOP_RATED_MIN_VOTES[
              movie ? 'movie' : 'tv'
            ]
          : params.has('vote_count.gte')
      )
      || (
        params.get('sort_by')
          === 'vote_count.desc'
          ? params.get('vote_average.gte')
            !== TOP_RATED_MIN_AVERAGE[
              movie ? 'movie' : 'tv'
            ]
          : params.has('vote_average.gte')
      )
      || params.get('include_adult') !== 'false'
      || params.get(tail) !== 'false'
      || (
        !params.has('with_genres')
        && !params.has('with_origin_country')
        && params.get('sort_by')
          !== 'vote_count.desc'
      )
      || (
        params.has('with_genres')
        && !validGenres(
          params.get('with_genres'),
        )
      )
      || (
        params.has('with_origin_country')
        && !validCountry(
          params.get('with_origin_country'),
        )
      )
      || dateKeys.some(
        key => (
          params.has(key)
          && !validIsoDate(
            params.get(key),
          )
        ),
      )
    ) {
      return null
    }
  } else {
    const match = path.match(/^\/(movie|tv|person)\/([^/]+)$/)

    if (
      !match
      || !validPositiveId(match[2])
      || !validLanguage(params.get('language'))
    ) {
      return null
    }

    const summaryRequest = (
      match[1] !== 'person'
      && exactParameters(
        params,
        ['language'],
      )
    )

    const detailRequest = (
      exactParameters(
        params,
        ['language', 'append_to_response'],
      )
      && params.get('append_to_response')
        === DETAIL_APPEND[match[1]]
    )

    if (!summaryRequest && !detailRequest) {
      return null
    }
  }

  return { path, query: new URLSearchParams(params), responseKind: responseKind(path) }
}

export function isExpectedTmdbPayload(payload, kind) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  if (kind === 'genres') return Array.isArray(payload.genres)
  if (kind === 'detail') return Number.isSafeInteger(payload.id) && payload.id > 0
  return Array.isArray(payload.results)
}
