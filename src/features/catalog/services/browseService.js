import { normalizeNamedItems } from './normalizeNamedItems.js'
import { getTmdb } from './tmdbClient.js'
import { normalizeCatalog } from './normalizeCatalog.js'
import { TmdbError } from './tmdbErrors.js'
import { BROWSE_ENDPOINTS, normalizeBrowse } from '../validation/browseValidation.js'
import { TMDB_DEFAULT_LANGUAGE } from '../../../shared/config/tmdb.js'

async function getGenres(type, { language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
  const data = await getTmdb(`/genre/${type}/list`, { language, signal, browse: {} })
  if (!data || !Array.isArray(data.genres)) throw new TmdbError('invalid')
  return normalizeNamedItems(data.genres)
}
async function browse(type, { language = TMDB_DEFAULT_LANGUAGE, signal, ...options } = {}) {
  const { view, genre, page } = normalizeBrowse(type, options)
  const path = genre ? `/discover/${type}` : BROWSE_ENDPOINTS[type][view]
  const params = { page: String(page) }
  if (genre) Object.assign(params, {
    sort_by: 'popularity.desc', include_adult: 'false', with_genres: String(genre),
    [type === 'movie' ? 'include_video' : 'include_null_first_air_dates']: 'false',
  })
  const data = await getTmdb(path, { language, signal, browse: params })
  return normalizeCatalog(data, type, page)
}
export const getMovieGenres = (options) => getGenres('movie', options)
export const getTvGenres = (options) => getGenres('tv', options)
export const browseMovies = (options) => browse('movie', options)
export const browseTvShows = (options) => browse('tv', options)
export const browsePeople = (options) => browse('person', options)
