import { normalizeMedia, validDate } from './catalogService.js'
import { normalizeCatalog } from './normalizeCatalog.js'
import { normalizeNamedItems } from './normalizeNamedItems.js'
import { asList, cleanText, positiveInteger, safeHomepage, selectTrailer } from './detailHelpers.js'
import { isTmdbImagePath } from './tmdbImages.js'
import { TmdbError } from './tmdbErrors.js'

const nonnegative = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null
export function getYearRange(first, last, inProduction, status) {
  const start = validDate(first), end = validDate(last)
  if (!start) return null
  const year = start.slice(0, 4)
  const finished = ['Ended', 'Canceled'].includes(status)
  if (!finished && (inProduction === true || status === 'Returning Series')) return `${year}–present`
  return finished && end && end >= start && end.slice(0, 4) !== year ? `${year}–${end.slice(0, 4)}` : year
}
export function normalizeEpisode(raw) {
  if (!raw || !positiveInteger(raw.id) || !cleanText(raw.name) || nonnegative(raw.season_number) === null || !positiveInteger(raw.episode_number)) return null
  return { id: raw.id, name: cleanText(raw.name), seasonNumber: raw.season_number, episodeNumber: raw.episode_number,
    airDate: validDate(raw.air_date), overview: cleanText(raw.overview), runtime: positiveInteger(raw.runtime) }
}
export function normalizeSeasons(raw) {
  const ids = new Set(), numbers = new Set()
  return asList(raw).filter((season) => {
    if (!season || !positiveInteger(season.id) || nonnegative(season.season_number) === null || !cleanText(season.name) || ids.has(season.id) || numbers.has(season.season_number)) return false
    ids.add(season.id); numbers.add(season.season_number); return true
  }).map((season) => ({ id: season.id, seasonNumber: season.season_number, name: cleanText(season.name),
    airDate: validDate(season.air_date), posterPath: isTmdbImagePath(season.poster_path) ? season.poster_path : null,
    episodeCount: positiveInteger(season.episode_count), overview: cleanText(season.overview) }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
}
export function selectCharacter(roles) {
  return asList(roles).filter((role) => role && cleanText(role.character)).slice()
    .sort((a, b) => (positiveInteger(b.episode_count) ?? 0) - (positiveInteger(a.episode_count) ?? 0)
      || cleanText(a.character).localeCompare(cleanText(b.character), 'en'))
    .map((role) => cleanText(role.character))[0] ?? ''
}
export function normalizeTvShowDetails(raw) {
  const media = normalizeMedia(raw, 'tv')
  if (!media) throw new TmdbError('invalid')
  const firstAirDate = media.releaseDate, lastAirDate = validDate(raw.last_air_date)
  const inProduction = typeof raw.in_production === 'boolean' ? raw.in_production : null
  const lastEpisode = normalizeEpisode(raw.last_episode_to_air), nextEpisode = normalizeEpisode(raw.next_episode_to_air)
  const ids = new Set()
  const cast = asList(raw.aggregate_credits?.cast).filter((p) => p && positiveInteger(p.id) && cleanText(p.name)).slice()
    .sort((a, b) => (nonnegative(a.order) ?? Number.MAX_SAFE_INTEGER) - (nonnegative(b.order) ?? Number.MAX_SAFE_INTEGER))
    .filter((p) => { if (ids.has(p.id)) return false; ids.add(p.id); return true }).slice(0, 12)
    .map((p) => ({ id: p.id, name: cleanText(p.name), character: selectCharacter(p.roles), episodeCount: positiveInteger(p.total_episode_count), profilePath: isTmdbImagePath(p.profile_path) ? p.profile_path : null }))
  const originCountries = [...new Set(asList(raw.origin_country).filter((code) => typeof code === 'string' && /^[A-Z]{2}$/.test(code)))]
  const recommendations = Array.isArray(raw.recommendations?.results) && (raw.recommendations.page === undefined || raw.recommendations.page === 1)
    ? normalizeCatalog(raw.recommendations, 'tv').results.filter((series) => series.id !== media.id).slice(0, 20) : []
  return {
    id: media.id, name: media.title, originalName: cleanText(raw.original_name), tagline: cleanText(raw.tagline), overview: media.overview,
    posterPath: media.posterPath, backdropPath: media.backdropPath, firstAirDate, lastAirDate,
    yearRange: getYearRange(firstAirDate, lastAirDate, inProduction, cleanText(raw.status)),
    episodeRuntime: asList(raw.episode_run_time).map(positiveInteger).find(Boolean) ?? lastEpisode?.runtime ?? null,
    genres: normalizeNamedItems(raw.genres), voteAverage: media.voteAverage, voteCount: media.voteCount,
    status: cleanText(raw.status), type: cleanText(raw.type), inProduction,
    originalLanguage: typeof raw.original_language === 'string' && /^[a-z]{2}$/.test(raw.original_language) ? raw.original_language : null,
    originCountries, creators: normalizeNamedItems(raw.created_by), networks: normalizeNamedItems(raw.networks), productionCompanies: normalizeNamedItems(raw.production_companies),
    numberOfSeasons: positiveInteger(raw.number_of_seasons), numberOfEpisodes: positiveInteger(raw.number_of_episodes),
    seasons: normalizeSeasons(raw.seasons), lastEpisode, nextEpisode,
    homepage: safeHomepage(raw.homepage), contentRating: cleanText(asList(raw.content_ratings?.results).find((rating) => rating?.iso_3166_1 === 'US' && cleanText(rating.rating))?.rating) || null,
    cast, trailer: selectTrailer(raw.videos?.results), recommendations,
  }
}
