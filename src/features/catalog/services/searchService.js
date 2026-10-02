import { normalizeCatalog } from './normalizeCatalog.js'
import { getTmdb } from './tmdbClient.js'
import { TmdbError } from './tmdbErrors.js'
import { getQueryError, normalizeQuery, normalizeType, normalizePage } from '../validation/searchValidation.js'
import {
  TMDB_DEFAULT_LANGUAGE,
  isTmdbLanguage,
} from '../../../shared/config/tmdb.js'

const endpoints = { all: 'multi', movie: 'movie', tv: 'tv', person: 'person' }
export async function searchCatalog({ query, type = 'all', page = 1, language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
  query = normalizeQuery(query)
  if (getQueryError(query) || !isTmdbLanguage(language)) throw new TmdbError('request')
  type = normalizeType(type)
  page = normalizePage(page)
  const data = await getTmdb(`/search/${endpoints[type]}`, { language, signal, search: { query, page } })
  return normalizeCatalog(data, type, page)
}
