import { isTmdbLanguage } from '../../../shared/config/tmdb.js'

import { normalizePage } from './searchValidation.js'

export const BROWSE_VIEWS = {
  movie: {
    popular: 'Popular',
    'top-rated': 'Top Rated',
    'now-playing': 'Now Playing',
    upcoming: 'Upcoming',
  },
  tv: {
    popular: 'Popular',
    'top-rated': 'Top Rated',
    'airing-today': 'Airing Today',
    'on-the-air': 'On The Air',
  },
  person: {
    popular: 'Popular',
    trending: 'Trending This Week',
  },
}

export const BROWSE_ENDPOINTS = {
  movie: {
    popular: '/movie/popular',
    'top-rated': '/movie/top_rated',
    'now-playing': '/movie/now_playing',
    upcoming: '/movie/upcoming',
  },
  tv: {
    popular: '/tv/popular',
    'top-rated': '/tv/top_rated',
    'airing-today': '/tv/airing_today',
    'on-the-air': '/tv/on_the_air',
  },
  person: {
    popular: '/person/popular',
    trending: '/trending/person/week',
  },
}

export function normalizeGenre(value) {
  const text = typeof value === 'number'
    ? String(value)
    : value

  return (
    typeof text === 'string'
    && /^[1-9]\d*$/.test(text)
    && Number.isSafeInteger(Number(text))
  )
    ? Number(text)
    : null
}

export function normalizeGenres(value) {
  if (
    value === null
    || value === undefined
    || value === ''
  ) {
    return []
  }

  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [value]

  const normalized = []

  for (const item of values) {
    const genre = normalizeGenre(item)

    if (
      genre !== null
      && !normalized.includes(genre)
    ) {
      normalized.push(genre)
    }
  }

  return normalized
}

export function normalizeCountry(value) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value
    .trim()
    .toUpperCase()

  return /^[A-Z]{2}$/.test(normalized)
    ? normalized
    : null
}

export function normalizeBrowse(
  type,
  {
    view,
    genres,
    genre,
    country,
    page,
  } = {},
) {
  const validView = (
    Object.hasOwn(
      BROWSE_VIEWS[type] ?? {},
      view,
    )
      ? view
      : 'popular'
  )

  const normalizedGenres = (
    type === 'person'
      ? []
      : normalizeGenres(
        genres ?? genre,
      )
  )

  const normalizedCountry = (
    type === 'person'
      ? null
      : normalizeCountry(country)
  )

  return {
    view: validView,
    genres: normalizedGenres,
    ...(normalizedCountry
      ? {
          country: normalizedCountry,
        }
      : {}),
    page: normalizePage(page),
  }
}

export function readBrowseParams(type, params) {
  return normalizeBrowse(type, {
    view: params.get('view'),
    genres: (
      params.has('genres')
        ? params.get('genres')
        : params.get('genre')
    ),
    country: params.get('country'),
    page: params.get('page'),
  })
}

export function createBrowseParams(type, value) {
  const {
    view,
    genres,
    country,
    page,
  } = normalizeBrowse(type, value)

  return new URLSearchParams({
    view,
    ...(genres.length
      ? {
          genres: genres.join(','),
        }
      : {}),
    ...(country
      ? {
          country,
        }
      : {}),
    page: String(page),
  })
}

export function changeBrowse(
  type,
  current,
  patch,
) {
  const next = {
    ...current,
    ...patch,
  }

  if (
    Object.hasOwn(patch, 'view')
    || Object.hasOwn(patch, 'genres')
    || Object.hasOwn(patch, 'genre')
    || Object.hasOwn(patch, 'country')
  ) {
    next.page = 1
  }

  return createBrowseParams(
    type,
    next,
  )
}

export function isBrowsePath(path) {
  return (
    Object.values(BROWSE_ENDPOINTS)
      .some(views => (
        Object.values(views)
          .includes(path)
      ))
    || [
      '/genre/movie/list',
      '/genre/tv/list',
      '/discover/movie',
      '/discover/tv',
    ].includes(path)
  )
}

function isCanonicalGenreList(value) {
  if (typeof value !== 'string') {
    return false
  }

  const genres = normalizeGenres(value)

  return (
    genres.length > 0
    && genres.join(',') === value
  )
}

function isIsoDate(value) {
  if (
    typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }

  const date = new Date(
    `${value}T00:00:00Z`,
  )

  return (
    !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10)
      === value
  )
}

export function isAllowedBrowseRequest(url) {
  const path = url.pathname.replace(
    /^\/api\/tmdb/,
    '',
  )

  if (
    !url.pathname.startsWith(
      '/api/tmdb/',
    )
    || !isBrowsePath(path)
  ) {
    return false
  }

  const params = url.searchParams

  if (
    !isTmdbLanguage(
      params.get('language'),
    )
  ) {
    return false
  }

  if (path.startsWith('/genre/')) {
    return (
      [...params].length === 1
      && params.getAll('language').length === 1
    )
  }

  if (
    String(
      normalizePage(params.get('page')),
    ) !== params.get('page')
  ) {
    return false
  }

  if (!path.startsWith('/discover/')) {
    const keys = ['language', 'page']

    return (
      [...params].length === keys.length
      && keys.every(key => (
        params.getAll(key).length === 1
      ))
    )
  }

  const movie = path === '/discover/movie'
  const tv = path === '/discover/tv'

  if (!movie && !tv) {
    return false
  }

  const extraKey = movie
    ? 'include_video'
    : 'include_null_first_air_dates'

  const required = [
    'language',
    'page',
    'sort_by',
    'include_adult',
    extraKey,
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
    ...dateKeys,
  ]

  const allowed = new Set([
    ...required,
    ...optional,
  ])

  for (const [key] of params) {
    if (
      !allowed.has(key)
      || params.getAll(key).length !== 1
    ) {
      return false
    }
  }

  if (
    !required.every(
      key => params.has(key),
    )
  ) {
    return false
  }

  if (
    !params.has('with_genres')
    && !params.has('with_origin_country')
  ) {
    return false
  }

  if (
    params.get('include_adult') !== 'false'
    || params.get(extraKey) !== 'false'
  ) {
    return false
  }

  if (
    params.has('with_genres')
    && !isCanonicalGenreList(
      params.get('with_genres'),
    )
  ) {
    return false
  }

  if (
    params.has('with_origin_country')
    && normalizeCountry(
      params.get('with_origin_country'),
    ) !== params.get('with_origin_country')
  ) {
    return false
  }

  const allowedSorts = movie
    ? [
        'popularity.desc',
        'vote_average.desc',
        'primary_release_date.asc',
      ]
    : [
        'popularity.desc',
        'vote_average.desc',
      ]

  if (
    !allowedSorts.includes(
      params.get('sort_by'),
    )
  ) {
    return false
  }

  for (const key of dateKeys) {
    if (
      params.has(key)
      && !isIsoDate(params.get(key))
    ) {
      return false
    }
  }

  return true
}
