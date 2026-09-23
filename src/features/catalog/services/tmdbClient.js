import { isMovieDetailPath, MOVIE_DETAIL_APPEND } from '../validation/detailRouteValidation.js'
import { isBrowsePath, isAllowedBrowseRequest } from '../validation/browseValidation.js'
import { TMDB_BASE_PATH, TMDB_DEFAULT_LANGUAGE } from '../../../shared/config/tmdb.js'
import { isTmdbAbort, TmdbError } from './tmdbErrors.js'

const searchEndpoints = new Set(['/search/multi', '/search/movie', '/search/tv', '/search/person'])
const endpoints = new Set(['/trending/movie/day', '/trending/tv/day'])

export async function getTmdb(path, { language = TMDB_DEFAULT_LANGUAGE, signal, search, browse, details = false } = {}) {
  if ((!endpoints.has(path) && !searchEndpoints.has(path) && !(details && isMovieDetailPath(path)) && !isBrowsePath(path)) || typeof language !== 'string' || !/^[a-z]{2}-[A-Z]{2}$/.test(language)) {
    throw new TmdbError('request')
  }
  const query = new URLSearchParams({ language })
  if (searchEndpoints.has(path)) {
    if (!search || typeof search.query !== 'string' || search.query.length < 2 || search.query.length > 100
      || !Number.isSafeInteger(search.page) || search.page < 1 || search.page > 500) throw new TmdbError('request')
    query.set('query', search.query)
    query.set('page', String(search.page))
    query.set('include_adult', 'false')
  }
  if (isBrowsePath(path)) {
    for (const [key, value] of Object.entries(browse ?? {})) query.append(key, value)
    if (!isAllowedBrowseRequest(new URL(`${TMDB_BASE_PATH}${path}?${query}`, 'http://localhost'))) throw new TmdbError('request')
  }
  if (details) {
    if (!isMovieDetailPath(path) || language !== 'en-US') throw new TmdbError('request')
    query.set('append_to_response', MOVIE_DETAIL_APPEND)
  }
  try {
    signal?.throwIfAborted()
    const response = await fetch(`${TMDB_BASE_PATH}${path}?${query}`, {
      method: 'GET', headers: { Accept: 'application/json' }, signal,
      credentials: 'omit', redirect: 'error',
    })
    if (!response.ok) {
      const status = response.status
      if (status === 400) throw new TmdbError('request')
      if (status === 401 || status === 403) throw new TmdbError('access')
      if (status === 404) throw new TmdbError('missing')
      if (status === 429) throw new TmdbError('limit')
      throw new TmdbError(status >= 500 ? 'server' : 'unknown')
    }
    let data
    try {
      data = await response.json()
    } catch (error) {
      if (signal?.aborted || isTmdbAbort(error)) throw new DOMException('Request cancelled', 'AbortError')
      throw new TmdbError('invalid')
    }
    signal?.throwIfAborted()
    return data
  } catch (error) {
    if (signal?.aborted || isTmdbAbort(error)) throw new DOMException('Request cancelled', 'AbortError')
    if (error instanceof TmdbError) throw error
    throw new TmdbError('network')
  }
}
