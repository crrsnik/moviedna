import { normalizeMedia } from './catalogService.js'
import { isTmdbImagePath } from './tmdbImages.js'
import { TmdbError } from './tmdbErrors.js'
import { normalizePage, MAX_SEARCH_PAGE } from '../validation/searchValidation.js'

function normalizePerson(item) {
  if (!Number.isSafeInteger(item.id) || item.id <= 0 || typeof item.name !== 'string' || !item.name.trim()) return null
  const knownFor = (Array.isArray(item.known_for) ? item.known_for : [])
    .filter((work) => work && ['movie', 'tv'].includes(work.media_type))
    .map((work) => normalizeMedia(work, work.media_type)).filter(Boolean).slice(0, 3)
    .map(({ id, mediaType, title, releaseDate }) => ({ id, mediaType, title, releaseDate }))
  return {
    id: item.id, mediaType: 'person', name: item.name.trim(),
    profilePath: isTmdbImagePath(item.profile_path) ? item.profile_path : null,
    knownForDepartment: typeof item.known_for_department === 'string' ? item.known_for_department.trim() : '',
    popularity: Number.isFinite(item.popularity) && item.popularity >= 0 ? item.popularity : 0,
    knownFor,
  }
}
export function normalizeCatalog(data, type, page = 1) {
  if (!data || !Array.isArray(data.results)) throw new TmdbError('invalid')
  const seen = new Set()
  const results = data.results.map((item) => {
    if (!item || typeof item !== 'object' || item.adult === true) return null
    const mediaType = type === 'all' ? item.media_type : type
    if (item.media_type !== undefined && item.media_type !== mediaType) return null
    return mediaType === 'person' ? normalizePerson(item) : ['movie', 'tv'].includes(mediaType) ? normalizeMedia(item, mediaType) : null
  }).filter((item) => {
    if (!item || seen.has(`${item.mediaType}:${item.id}`)) return false
    seen.add(`${item.mediaType}:${item.id}`)
    return true
  })
  const totalResults = Number.isSafeInteger(data.total_results) && data.total_results >= 0 ? data.total_results : results.length
  const totalPages = Number.isSafeInteger(data.total_pages) && data.total_pages >= 0
    ? Math.min(MAX_SEARCH_PAGE, Math.max(results.length ? 1 : 0, data.total_pages)) : (totalResults ? 1 : 0)
  return { page: Math.min(normalizePage(data.page ?? page), Math.max(1, totalPages)), totalPages, totalResults, results }
}
