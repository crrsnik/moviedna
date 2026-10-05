import { normalizeNamedItems } from './normalizeNamedItems.js'
import { getTmdb } from './tmdbClient.js'
import { normalizeCatalog } from './normalizeCatalog.js'
import { TmdbError } from './tmdbErrors.js'

import {
  BROWSE_ENDPOINTS,
  normalizeBrowse,
} from '../validation/browseValidation.js'

import {
  TMDB_DEFAULT_LANGUAGE,
} from '../../../shared/config/tmdb.js'

async function getGenres(
  type,
  {
    language = TMDB_DEFAULT_LANGUAGE,
    signal,
  } = {},
) {
  const data = await getTmdb(
    `/genre/${type}/list`,
    {
      language,
      signal,
      browse: {},
    },
  )

  if (
    !data
    || !Array.isArray(data.genres)
  ) {
    throw new TmdbError('invalid')
  }

  return normalizeNamedItems(data.genres)
}

function localDateString(date) {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function shiftedDateString(days) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)

  return localDateString(date)
}

function discoverViewParams(type, view) {
  const today = shiftedDateString(0)

  if (view === 'top-rated') {
    return {
      sort_by: 'vote_average.desc',
    }
  }

  if (
    type === 'movie'
    && view === 'upcoming'
  ) {
    return {
      sort_by: 'primary_release_date.asc',
      'primary_release_date.gte': today,
    }
  }

  if (
    type === 'movie'
    && view === 'now-playing'
  ) {
    return {
      sort_by: 'popularity.desc',
      'primary_release_date.gte':
        shiftedDateString(-45),
      'primary_release_date.lte': today,
    }
  }

  if (
    type === 'tv'
    && view === 'airing-today'
  ) {
    return {
      sort_by: 'popularity.desc',
      'air_date.gte': today,
      'air_date.lte': today,
    }
  }

  if (
    type === 'tv'
    && view === 'on-the-air'
  ) {
    return {
      sort_by: 'popularity.desc',
      'air_date.gte': today,
      'air_date.lte':
        shiftedDateString(7),
    }
  }

  return {
    sort_by: 'popularity.desc',
  }
}

async function browse(
  type,
  {
    language = TMDB_DEFAULT_LANGUAGE,
    signal,
    ...options
  } = {},
) {
  const {
    view,
    genres,
    country = null,
    page,
  } = normalizeBrowse(
    type,
    options,
  )

  const hasGenres = (
    genres.length > 0
  )

  const hasCountry = (
    typeof country === 'string'
  )

  const hasFilters = (
    hasGenres
    || hasCountry
  )

  const path = hasFilters
    ? `/discover/${type}`
    : BROWSE_ENDPOINTS[type][view]

  const params = {
    page: String(page),
  }

  if (hasFilters) {
    Object.assign(
      params,
      discoverViewParams(type, view),
      {
        include_adult: 'false',
        [
          type === 'movie'
            ? 'include_video'
            : 'include_null_first_air_dates'
        ]: 'false',
      },
    )

    if (hasGenres) {
      params.with_genres = genres.join(',')
    }

    if (hasCountry) {
      params.with_origin_country = country
    }
  }

  const data = await getTmdb(
    path,
    {
      language,
      signal,
      browse: params,
    },
  )

  return normalizeCatalog(
    data,
    type,
    page,
  )
}

export const getMovieGenres = options => (
  getGenres('movie', options)
)

export const getTvGenres = options => (
  getGenres('tv', options)
)

export const browseMovies = options => (
  browse('movie', options)
)

export const browseTvShows = options => (
  browse('tv', options)
)

export const browsePeople = options => (
  browse('person', options)
)
