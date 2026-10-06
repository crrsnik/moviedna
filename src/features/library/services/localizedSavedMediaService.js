import {
  getMovieDetails,
} from '../../catalog/services/movieDetailsService.js'

import {
  getTvShowDetails,
} from '../../catalog/services/tvShowDetailsService.js'

const MAX_CONCURRENT_REQUESTS = 6

const cache = new Map()
const pending = new Map()
const queue = []

let activeRequests = 0

function validYear(value) {
  const numeric = Number(value)

  return (
    Number.isInteger(numeric)
    && numeric >= 1800
    && numeric <= 2200
  )
    ? numeric
    : null
}

function tvReleaseYear(detail) {
  return (
    typeof detail?.firstAirDate === 'string'
  )
    ? validYear(
        detail.firstAirDate.slice(0, 4),
      )
    : null
}

export function localizedSavedMediaDisplay(
  item,
  detail,
) {
  const localizedTitle = (
    item?.mediaType === 'movie'
      ? detail?.title
      : detail?.name
  )

  const localizedYear = (
    item?.mediaType === 'movie'
      ? validYear(detail?.releaseYear)
      : tvReleaseYear(detail)
  )

  return {
    title: (
      typeof localizedTitle === 'string'
      && localizedTitle.trim()
    )
      ? localizedTitle.trim()
      : item.title,

    posterPath:
      detail?.posterPath
      ?? item.posterPath,

    releaseYear:
      localizedYear
      ?? item.releaseYear,
  }
}

function drainQueue() {
  while (
    activeRequests
      < MAX_CONCURRENT_REQUESTS
    && queue.length
  ) {
    const {
      task,
      resolve,
      reject,
    } = queue.shift()

    activeRequests += 1

    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        activeRequests -= 1
        drainQueue()
      })
  }
}

function enqueue(task) {
  return new Promise(
    (resolve, reject) => {
      queue.push({
        task,
        resolve,
        reject,
      })

      drainQueue()
    },
  )
}

async function loadDetail(
  item,
  language,
) {
  if (item.mediaType === 'movie') {
    return getMovieDetails({
      movieId: item.tmdbId,
      language,
    })
  }

  return getTvShowDetails({
    seriesId: item.tmdbId,
    language,
  })
}

export function loadLocalizedSavedMedia(
  item,
  language,
) {
  const key = [
    language,
    item.mediaType,
    item.tmdbId,
  ].join(':')

  if (cache.has(key)) {
    return Promise.resolve(
      cache.get(key),
    )
  }

  if (pending.has(key)) {
    return pending.get(key)
  }

  const request = enqueue(
    async () => {
      const detail = await loadDetail(
        item,
        language,
      )

      const display =
        localizedSavedMediaDisplay(
          item,
          detail,
        )

      cache.set(
        key,
        display,
      )

      return display
    },
  ).finally(() => {
    pending.delete(key)
  })

  pending.set(
    key,
    request,
  )

  return request
}
