import { normalizeNamedItems } from './normalizeNamedItems.js'
import { getTmdb } from './tmdbClient.js'
import { normalizeCatalog } from './normalizeCatalog.js'
import { rankTopRatedResults } from './topRatedRanking.js'
import { rankPopularResults } from './popularRanking.js'
import { TmdbError } from './tmdbErrors.js'

import {
  BROWSE_ENDPOINTS,
  TOP_RATED_MIN_AVERAGE,
  TOP_RATED_MIN_VOTES,
  normalizeBrowse,
} from '../validation/browseValidation.js'

import {
  TMDB_DEFAULT_LANGUAGE,
} from '../../../shared/config/tmdb.js'

const TOP_RATED_POOL_PAGES = 10

const TOP_RATED_MOST_VOTED_PAGES =
  Object.freeze({
    movie: 8,
    tv: 12,
  })

const TOP_RATED_PAGE_SIZE = 20

const POPULAR_POOL_PAGES = 5
const POPULAR_PAGE_SIZE = 20

// Top Rated changes slowly, so keep the ranked candidate pool
// for the current browser session. The key includes locale and
// active filters, so unrelated catalog views never share data.
const topRatedPoolCache = new Map()


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
      'vote_count.gte': String(
        TOP_RATED_MIN_VOTES[type],
      ),
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

  async function loadPage(sourcePage) {
    const sourceParams = {
      ...params,
      page: String(sourcePage),
    }

    const data = await getTmdb(
      path,
      {
        language,
        signal,
        browse: sourceParams,
      },
    )

    return normalizeCatalog(
      data,
      type,
      sourcePage,
    )
  }

  async function loadMostVotedPage(
    sourcePage,
  ) {
    const sourceParams = {
      page: String(sourcePage),
      sort_by: 'vote_count.desc',
      'vote_average.gte': String(
        TOP_RATED_MIN_AVERAGE[type],
      ),
      include_adult: 'false',
      [
        type === 'movie'
          ? 'include_video'
          : 'include_null_first_air_dates'
      ]: 'false',
    }

    if (hasGenres) {
      sourceParams.with_genres =
        genres.join(',')
    }

    if (hasCountry) {
      sourceParams.with_origin_country =
        country
    }

    const data = await getTmdb(
      `/discover/${type}`,
      {
        language,
        signal,
        browse: sourceParams,
      },
    )

    return normalizeCatalog(
      data,
      type,
      sourcePage,
    )
  }


  async function loadTrendingWeek() {
    const data = await getTmdb(
      `/trending/${type}/week`,
      {
        language,
        signal,
      },
    )

    return normalizeCatalog(
      data,
      type,
      1,
    )
  }

  async function loadRange(
    load,
    first,
    last,
  ) {
    if (last < first) return []

    const output = []
    const batchSize = 4

    for (
      let start = first;
      start <= last;
      start += batchSize
    ) {
      const end = Math.min(
        last,
        start + batchSize - 1,
      )

      const batch = await Promise.all(
        Array.from(
          {
            length: end - start + 1,
          },
          (_, index) => (
            load(start + index)
          ),
        ),
      )

      output.push(...batch)
    }

    return output
  }

  if (
    view === 'popular'
    && ['movie', 'tv'].includes(type)
    && !hasFilters
  ) {
    const [
      firstPage,
      trendingPage,
    ] = await Promise.all([
      loadPage(1),
      loadTrendingWeek(),
    ])

    const sourcePageCount = Math.max(
      1,
      Math.min(
        POPULAR_POOL_PAGES,
        firstPage.totalPages,
      ),
    )

    const remainingPages =
      await loadRange(
        loadPage,
        2,
        sourcePageCount,
      )

    const merged = [
      firstPage,
      ...remainingPages,
      trendingPage,
    ].flatMap(result => result.results)

    const trendingIds =
      trendingPage.results.map(
        item => item.id,
      )

    const rankedPool = rankPopularResults(
      merged,
      type,
      {
        trendingIds,
      },
    )

    const totalResults =
      rankedPool.length

    const totalPages = Math.max(
      1,
      Math.ceil(
        totalResults
          / POPULAR_PAGE_SIZE,
      ),
    )

    const safePage = Math.min(
      page,
      totalPages,
    )

    const offset = (
      safePage - 1
    ) * POPULAR_PAGE_SIZE

    return {
      page: safePage,
      totalPages,
      totalResults,
      results: rankedPool.slice(
        offset,
        offset + POPULAR_PAGE_SIZE,
      ),
    }
  }

  if (
    view === 'top-rated'
    && ['movie', 'tv'].includes(type)
  ) {
    const cacheKey = JSON.stringify([
      type,
      language,
      genres,
      country,
    ])

    let rankedPool =
      topRatedPoolCache.get(cacheKey)

    if (!rankedPool) {
      // Build the candidate pool from two independent
      // signals:
      //
      // 1. TMDb Top Rated catches exceptional ratings.
      // 2. Most Voted catches established mainstream
      //    classics that raw vote_average ordering can
      //    bury many pages deep.
      const [
        firstPage,
        firstMostVotedPage,
      ] = await Promise.all([
        loadPage(1),
        loadMostVotedPage(1),
      ])

      const sourcePageCount = Math.max(
        1,
        Math.min(
          TOP_RATED_POOL_PAGES,
          firstPage.totalPages,
        ),
      )

      const mostVotedPageCount = Math.max(
        1,
        Math.min(
          TOP_RATED_MOST_VOTED_PAGES[
            type
          ],
          firstMostVotedPage.totalPages,
        ),
      )

      const [
        remainingPages,
        remainingMostVotedPages,
      ] = await Promise.all([
        loadRange(
          loadPage,
          2,
          sourcePageCount,
        ),
        loadRange(
          loadMostVotedPage,
          2,
          mostVotedPageCount,
        ),
      ])

      const seen = new Set()

      const merged = [
        firstPage,
        ...remainingPages,
        firstMostVotedPage,
        ...remainingMostVotedPages,
      ]
        .flatMap(result => result.results)
        .filter(item => {
          const key =
            `${item.mediaType}:${item.id}`

          if (seen.has(key)) {
            return false
          }

          seen.add(key)
          return true
        })

      rankedPool = rankTopRatedResults(
        merged,
        type,
      )

      topRatedPoolCache.set(
        cacheKey,
        rankedPool,
      )
    }

    const totalResults =
      rankedPool.length

    const totalPages = Math.max(
      1,
      Math.ceil(
        totalResults
          / TOP_RATED_PAGE_SIZE,
      ),
    )

    const safePage = Math.min(
      page,
      totalPages,
    )

    const offset = (
      safePage - 1
    ) * TOP_RATED_PAGE_SIZE

    return {
      page: safePage,
      totalPages,
      totalResults,
      results: rankedPool.slice(
        offset,
        offset + TOP_RATED_PAGE_SIZE,
      ),
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
