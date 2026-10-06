import {
  getTmdb,
} from './tmdbClient.js'

const RECOGNITION_MEDIA_PER_TYPE = 8
const RECOGNITION_CAST_PER_TITLE = 8

const recognitionCache = new Map()

function positiveNumber(value) {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value > 0
  )
    ? value
    : 0
}

function validPerson(person) {
  return (
    person
    && typeof person === 'object'
    && Number.isSafeInteger(person.id)
    && person.id > 0
    && typeof person.name === 'string'
    && person.name.trim()
  )
}

function mediaWork(detail, mediaType) {
  const title = (
    mediaType === 'movie'
      ? detail?.title
      : detail?.name
  )

  if (
    !Number.isSafeInteger(detail?.id)
    || detail.id <= 0
    || typeof title !== 'string'
    || !title.trim()
  ) {
    return null
  }

  return {
    id: detail.id,
    media_type: mediaType,
    ...(mediaType === 'movie'
      ? {
          title: title.trim(),
          release_date:
            detail.release_date ?? null,
        }
      : {
          name: title.trim(),
          first_air_date:
            detail.first_air_date ?? null,
        }),
    vote_count: positiveNumber(
      detail.vote_count,
    ),
    popularity: positiveNumber(
      detail.popularity,
    ),
    original_language:
      typeof detail.original_language
        === 'string'
        ? detail.original_language
        : null,
  }
}

function rawCast(detail, mediaType) {
  const cast = (
    mediaType === 'movie'
      ? detail?.credits?.cast
      : detail?.aggregate_credits?.cast
  )

  return (
    Array.isArray(cast)
      ? cast
      : []
  )
    .filter(validPerson)
    .slice(
      0,
      RECOGNITION_CAST_PER_TITLE,
    )
}

function mergeWorks(left, right) {
  const map = new Map()

  for (
    const work
    of [
      ...(Array.isArray(left)
        ? left
        : []),
      ...(Array.isArray(right)
        ? right
        : []),
    ]
  ) {
    if (
      !work
      || typeof work !== 'object'
      || !Number.isSafeInteger(work.id)
      || !['movie', 'tv'].includes(
        work.media_type,
      )
    ) {
      continue
    }

    const key =
      `${work.media_type}:${work.id}`

    if (!map.has(key)) {
      map.set(key, work)
    }
  }

  return [...map.values()]
    .sort((a, b) => (
      positiveNumber(b.vote_count)
        - positiveNumber(a.vote_count)
      || positiveNumber(b.popularity)
        - positiveNumber(a.popularity)
    ))
    .slice(0, 3)
}

export function buildRecognitionPeoplePool(
  mediaDetails,
) {
  const people = new Map()

  for (
    const entry
    of Array.isArray(mediaDetails)
      ? mediaDetails
      : []
  ) {
    const mediaType =
      entry?.mediaType

    if (
      !['movie', 'tv'].includes(
        mediaType,
      )
    ) {
      continue
    }

    const detail = entry.detail
    const work = mediaWork(
      detail,
      mediaType,
    )

    if (!work) continue

    for (
      const person
      of rawCast(
        detail,
        mediaType,
      )
    ) {
      const current =
        people.get(person.id)

      const next = {
        id: person.id,
        name: person.name.trim(),
        profile_path:
          person.profile_path ?? null,
        known_for_department:
          person.known_for_department
          ?? 'Acting',
        popularity: positiveNumber(
          person.popularity,
        ),
        known_for: [work],
      }

      if (!current) {
        people.set(
          person.id,
          next,
        )
        continue
      }

      people.set(
        person.id,
        {
          ...current,
          profile_path:
            current.profile_path
            ?? next.profile_path,
          popularity: Math.max(
            positiveNumber(
              current.popularity,
            ),
            next.popularity,
          ),
          known_for: mergeWorks(
            current.known_for,
            next.known_for,
          ),
        },
      )
    }
  }

  return [...people.values()]
}

export function mergePeopleCandidatePools(
  base,
  recognition,
  {
    includeRecognition = false,
  } = {},
) {
  const result = []
  const indexById = new Map()

  for (
    const person
    of Array.isArray(base)
      ? base
      : []
  ) {
    if (!validPerson(person)) continue

    indexById.set(
      person.id,
      result.length,
    )

    result.push({
      ...person,
      known_for: (
        Array.isArray(person.known_for)
          ? [...person.known_for]
          : []
      ),
    })
  }

  for (
    const person
    of Array.isArray(recognition)
      ? recognition
      : []
  ) {
    if (!validPerson(person)) continue

    const index =
      indexById.get(person.id)

    if (index !== undefined) {
      const current = result[index]

      result[index] = {
        ...current,
        profile_path:
          current.profile_path
          ?? person.profile_path
          ?? null,
        popularity: Math.max(
          positiveNumber(
            current.popularity,
          ),
          positiveNumber(
            person.popularity,
          ),
        ),
        known_for: mergeWorks(
          current.known_for,
          person.known_for,
        ),
      }

      continue
    }

    if (!includeRecognition) continue

    indexById.set(
      person.id,
      result.length,
    )

    result.push(person)
  }

  return result
}

async function loadMostVotedMedia(
  mediaType,
  {
    language,
    signal,
  },
) {
  const extraKey = (
    mediaType === 'movie'
      ? 'include_video'
      : 'include_null_first_air_dates'
  )

  const data = await getTmdb(
    `/discover/${mediaType}`,
    {
      language,
      signal,
      browse: {
        page: '1',
        sort_by: 'vote_count.desc',
        include_adult: 'false',
        [extraKey]: 'false',
      },
    },
  )

  if (
    !data
    || !Array.isArray(data.results)
  ) {
    return []
  }

  return data.results
    .filter(media => (
      media
      && Number.isSafeInteger(media.id)
      && media.id > 0
    ))
    .slice(
      0,
      RECOGNITION_MEDIA_PER_TYPE,
    )
    .map(media => ({
      mediaType,
      id: media.id,
    }))
}

export async function loadRecognitionPeoplePool(
  {
    language,
    signal,
  },
) {
  const cacheKey = language

  if (
    typeof window !== 'undefined'
    && recognitionCache.has(cacheKey)
  ) {
    return recognitionCache.get(
      cacheKey,
    )
  }

  const [
    movies,
    tvShows,
  ] = await Promise.all([
    loadMostVotedMedia(
      'movie',
      {
        language,
        signal,
      },
    ),
    loadMostVotedMedia(
      'tv',
      {
        language,
        signal,
      },
    ),
  ])

  const seeds = [
    ...movies,
    ...tvShows,
  ]

  const settled =
    await Promise.allSettled(
      seeds.map(
        async seed => ({
          mediaType:
            seed.mediaType,
          detail: await getTmdb(
            `/${seed.mediaType}/${seed.id}`,
            {
              language,
              signal,
              details: true,
            },
          ),
        }),
      ),
    )

  if (signal?.aborted) {
    throw new DOMException(
      'Request cancelled',
      'AbortError',
    )
  }

  const pool =
    buildRecognitionPeoplePool(
      settled.flatMap(result => (
        result.status === 'fulfilled'
          ? [result.value]
          : []
      )),
    )

  if (
    typeof window !== 'undefined'
  ) {
    recognitionCache.set(
      cacheKey,
      pool,
    )
  }

  return pool
}
