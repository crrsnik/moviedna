import { normalizeMedia, validDate } from './catalogService.js'
import { asList, cleanText, positiveInteger, safeHomepage } from './detailHelpers.js'
import { isTmdbImagePath } from './tmdbImages.js'
import { TmdbError } from './tmdbErrors.js'

export function normalizePersonCredits(raw, kind) {
  const grouped = new Map()
  for (const item of asList(raw)) {
    if (!item || item.adult === true || !['movie', 'tv'].includes(item.media_type)) continue
    const media = normalizeMedia(item, item.media_type)
    if (!media) continue
    const key = `${media.mediaType}:${media.id}`
    const role = cleanText(kind === 'acting' ? item.character : item.job) || (kind === 'crew' ? cleanText(item.department) : '')
    if (!grouped.has(key)) grouped.set(key, { media, roles: new Set() })
    if (role) grouped.get(key).roles.add(role)
  }
  return [...grouped.values()].map(({ media, roles }) => ({ ...media,
    releaseYear: media.releaseDate?.slice(0, 4) ?? null, roleLabel: [...roles].join(' / '),
  })).sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
}

export function normalizePersonExternalLinks(raw) {
  const sources = [
    ['imdb_id', 'IMDb', 'https://www.imdb.com/name/', /^nm\d+$/],
    ['instagram_id', 'Instagram', 'https://www.instagram.com/', /^[\p{L}\p{N}_.-]{1,100}$/u],
    ['twitter_id', 'X / Twitter', 'https://x.com/', /^[A-Za-z0-9_]{1,15}$/],
    ['facebook_id', 'Facebook', 'https://www.facebook.com/', /^[\p{L}\p{N}_.-]{1,100}$/u],
  ]
  return sources.flatMap(([key, label, base, valid]) => {
    const id = cleanText(raw?.[key])
    return id && id !== '.' && id !== '..' && valid.test(id) ? [{ label, url: base + encodeURIComponent(id) }] : []
  })
}

export function normalizePersonDetails(raw) {
  if (!raw || !positiveInteger(raw.id) || !cleanText(raw.name)) throw new TmdbError('invalid')
  const profilePath = isTmdbImagePath(raw.profile_path) ? raw.profile_path : null
  const actingCredits = normalizePersonCredits(raw.combined_credits?.cast, 'acting')
  const crewCredits = normalizePersonCredits(raw.combined_credits?.crew, 'crew')
  const known = new Map()
  for (const credit of [...actingCredits, ...crewCredits]) {
    const key = `${credit.mediaType}:${credit.id}`
    const previous = known.get(key)
    if (!previous || credit.popularity > previous.popularity || (credit.popularity === previous.popularity && credit.voteCount > previous.voteCount)) known.set(key, credit)
  }
  const knownFor = [...known.values()].sort((a, b) => b.popularity - a.popularity || b.voteCount - a.voteCount
    || a.mediaType.localeCompare(b.mediaType) || a.id - b.id).slice(0, 12)
  const images = [...new Set(asList(raw.images?.profiles).map((image) => image?.file_path)
    .filter((path) => isTmdbImagePath(path) && path !== profilePath))].sort().slice(0, 8)
  return {
    id: raw.id, name: cleanText(raw.name),
    alsoKnownAs: [...new Set(asList(raw.also_known_as).map(cleanText).filter(Boolean))].slice(0, 12),
    biography: cleanText(raw.biography), profilePath, birthday: validDate(raw.birthday), deathday: validDate(raw.deathday),
    placeOfBirth: cleanText(raw.place_of_birth), knownForDepartment: cleanText(raw.known_for_department),
    genderLabel: Number.isInteger(raw.gender) ? ({ 1: 'Female', 2: 'Male', 3: 'Non-binary' }[raw.gender] ?? null) : null,
    homepage: safeHomepage(raw.homepage), externalLinks: normalizePersonExternalLinks(raw.external_ids),
    images, knownFor, actingCredits, crewCredits,
  }
}
