import { TMDB_BASE_PATH, TMDB_DEFAULT_LANGUAGE } from '../../../shared/config/tmdb.js'
import { isTmdbAbort, TmdbError } from './tmdbErrors.js'

const endpoints = new Set(['/trending/movie/day', '/trending/tv/day'])

export async function getTmdb(path, { language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
  if (!endpoints.has(path) || typeof language !== 'string' || !/^[a-z]{2}-[A-Z]{2}$/.test(language)) {
    throw new TmdbError('request')
  }
  const query = new URLSearchParams({ language })
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
