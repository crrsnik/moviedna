import { safeHomepage, selectTrailer } from './detailHelpers.js'
export { safeHomepage, selectTrailer, formatRuntime } from './detailHelpers.js'
import { normalizeMedia } from './catalogService.js'
import { normalizeCatalog } from './normalizeCatalog.js'
import { normalizeNamedItems } from './normalizeNamedItems.js'
import { isTmdbImagePath } from './tmdbImages.js'
import { TmdbError } from './tmdbErrors.js'

const list = (value) => Array.isArray(value) ? value : []
const text = (value) => typeof value === 'string' ? value.trim() : ''
const positive = (value) => Number.isSafeInteger(value) && value > 0 ? value : null
export function selectCertification(releaseDates) {
  const releases = list(releaseDates).filter((country) => country?.iso_3166_1 === 'US')
    .flatMap((country) => list(country.release_dates))
    .filter((release) => release && [1, 2, 3, 4, 5, 6].includes(release.type) && text(release.certification))
  const rank = (release) => release.type === 3 ? 0 : release.type === 2 ? 1 : 2
  releases.sort((a, b) => rank(a) - rank(b))
  return text(releases[0]?.certification) || null
}
export function normalizeMovieDetails(raw) {
  const media = normalizeMedia(raw, 'movie')
  if (!media) throw new TmdbError('invalid')
  const crew = list(raw.credits?.crew)
  const castIds = new Set()
  const cast = list(raw.credits?.cast).filter((person) => person && positive(person.id) && text(person.name))
    .slice().sort((a, b) => {
      const order = (p) => Number.isSafeInteger(p.order) && p.order >= 0 ? p.order : Number.MAX_SAFE_INTEGER
      return order(a) - order(b)
    }).filter((person) => {
      if (castIds.has(person.id)) return false
      castIds.add(person.id); return true
    }).slice(0, 12).map((person) => ({ id: person.id, name: text(person.name), character: text(person.character), profilePath: isTmdbImagePath(person.profile_path) ? person.profile_path : null }))
  const countries = new Set()
  const productionCountries = list(raw.production_countries).filter((country) => {
    if (!country || !/^[A-Z]{2}$/.test(country.iso_3166_1) || !text(country.name) || countries.has(country.iso_3166_1)) return false
    countries.add(country.iso_3166_1); return true
  }).map((country) => ({ code: country.iso_3166_1, name: text(country.name) }))
  const recommendations = Array.isArray(raw.recommendations?.results) && (raw.recommendations.page === undefined || raw.recommendations.page === 1)
    ? normalizeCatalog(raw.recommendations, 'movie').results.filter((movie) => movie.id !== media.id).slice(0, 20) : []
  return {
    id: media.id, title: media.title, originalTitle: text(raw.original_title), tagline: text(raw.tagline), overview: media.overview,
    posterPath: media.posterPath, backdropPath: media.backdropPath, releaseDate: media.releaseDate, releaseYear: media.releaseDate?.slice(0, 4) ?? null,
    runtime: positive(raw.runtime), status: text(raw.status), originalLanguage: typeof raw.original_language === 'string' && /^[a-z]{2}$/.test(raw.original_language) ? raw.original_language : null,
    genres: normalizeNamedItems(raw.genres), voteAverage: media.voteAverage, voteCount: media.voteCount,
    budget: positive(raw.budget), revenue: positive(raw.revenue), productionCountries, productionCompanies: normalizeNamedItems(raw.production_companies),
    homepage: safeHomepage(raw.homepage), certification: selectCertification(raw.release_dates?.results),
    directors: normalizeNamedItems(crew.filter((person) => person?.job === 'Director')),
    writers: normalizeNamedItems(crew.filter((person) => ['Writer', 'Screenplay', 'Story'].includes(person?.job))),
    cast, trailer: selectTrailer(raw.videos?.results), recommendations,
  }
}
export function formatMoney(value) {
  return positive(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) : null
}
