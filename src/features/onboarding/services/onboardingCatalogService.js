import {
  TMDB_DEFAULT_LANGUAGE,
} from '../../../shared/config/tmdb.js'
import {
  getTmdb,
} from '../../catalog/services/tmdbClient.js'
import {
  TmdbError,
} from '../../catalog/services/tmdbErrors.js'
import {
  isTmdbImagePath,
} from '../../catalog/services/tmdbImages.js'
import {
  validDate,
} from '../../catalog/services/catalogService.js'
import {
  isValidDetailId,
} from '../../catalog/validation/detailRouteValidation.js'

const MEDIA_TYPES = new Set(['movie', 'tv'])

function normalizeGenreIds(value) {
  if (!Array.isArray(value)) return []

  const seen = new Set()
  const result = []

  for (const genre of value) {
    const id = Number.isSafeInteger(genre)
      ? genre
      : genre?.id

    if (
      !Number.isSafeInteger(id)
      || id <= 0
      || seen.has(id)
    ) {
      continue
    }

    seen.add(id)
    result.push(id)

    if (result.length === 10) break
  }

  return result
}

export function normalizeOnboardingMediaSummary(
  raw,
  mediaType,
) {
  if (
    !raw
    || typeof raw !== 'object'
    || Array.isArray(raw)
    || !MEDIA_TYPES.has(mediaType)
    || !Number.isSafeInteger(raw.id)
    || raw.id <= 0
    || raw.adult === true
    || (
      raw.media_type !== undefined
      && raw.media_type !== mediaType
    )
  ) {
    throw new TmdbError('invalid')
  }

  const title = mediaType === 'movie'
    ? raw.title
    : raw.name

  if (
    typeof title !== 'string'
    || !title.trim()
  ) {
    throw new TmdbError('invalid')
  }

  return {
    id: raw.id,
    mediaType,
    title: title.trim(),
    overview: typeof raw.overview === 'string'
      ? raw.overview
      : '',
    posterPath: isTmdbImagePath(raw.poster_path)
      ? raw.poster_path
      : null,
    backdropPath: isTmdbImagePath(raw.backdrop_path)
      ? raw.backdrop_path
      : null,
    releaseDate: validDate(
      mediaType === 'movie'
        ? raw.release_date
        : raw.first_air_date,
    ),
    voteAverage:
      Number.isFinite(raw.vote_average)
      && raw.vote_average >= 0
      && raw.vote_average <= 10
        ? raw.vote_average
        : null,
    voteCount:
      Number.isSafeInteger(raw.vote_count)
      && raw.vote_count >= 0
        ? raw.vote_count
        : 0,
    genreIds: normalizeGenreIds(
      raw.genres ?? raw.genre_ids,
    ),
    popularity:
      Number.isFinite(raw.popularity)
      && raw.popularity >= 0
        ? raw.popularity
        : 0,
  }
}

export async function getOnboardingMediaSummary({
  mediaType,
  tmdbId,
  language = TMDB_DEFAULT_LANGUAGE,
  signal,
} = {}) {
  if (
    !MEDIA_TYPES.has(mediaType)
    || !isValidDetailId(tmdbId)
  ) {
    throw new TmdbError('missing')
  }

  const data = await getTmdb(
    `/${mediaType}/${tmdbId}`,
    {
      language,
      signal,
      summary: true,
    },
  )

  const media = normalizeOnboardingMediaSummary(
    data,
    mediaType,
  )

  if (media.id !== Number(tmdbId)) {
    throw new TmdbError('invalid')
  }

  return media
}
