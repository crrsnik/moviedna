import {
  isTmdbImagePath,
} from './tmdbImages.js'

function positiveNumber(value) {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value > 0
  )
    ? value
    : 0
}

function knownWorks(person) {
  return (
    Array.isArray(person?.known_for)
      ? person.known_for
      : []
  )
    .filter(work => (
      work
      && typeof work === 'object'
      && ['movie', 'tv'].includes(
        work.media_type,
      )
    ))
    .slice(0, 3)
}

function normalizedLog(value, maximum) {
  if (
    value <= 0
    || maximum <= 0
  ) {
    return 0
  }

  return (
    Math.log1p(value)
    / Math.log1p(maximum)
  )
}

export function isReadablePersonName(
  name,
) {
  return (
    typeof name === 'string'
    && /[\p{Script=Latin}\p{Script=Cyrillic}]/u
      .test(name)
  )
}

export function balanceReadablePeople(
  people,
  {
    pageSize = 20,
    minReadable = 14,
  } = {},
) {
  if (!Array.isArray(people)) return []

  const remaining = [...people]
  const result = []

  while (remaining.length) {
    const page = []

    const readableAvailable =
      remaining.filter(person => (
        isReadablePersonName(
          person?.name,
        )
      )).length

    const readableTarget = Math.min(
      minReadable,
      pageSize,
      readableAvailable,
    )

    for (
      let index = 0;
      index < remaining.length
        && page.length < readableTarget;
    ) {
      if (
        isReadablePersonName(
          remaining[index]?.name,
        )
      ) {
        page.push(
          remaining.splice(
            index,
            1,
          )[0],
        )
      } else {
        index += 1
      }
    }

    while (
      page.length < pageSize
      && remaining.length
    ) {
      page.push(
        remaining.shift(),
      )
    }

    result.push(...page)
  }

  return result
}

export function rankPeopleResults(
  input,
  {
    view = 'popular',
  } = {},
) {
  if (!Array.isArray(input)) return []

  const seen = new Set()

  const candidates = input.flatMap(
    (person, sourceIndex) => {
      if (
        !person
        || typeof person !== 'object'
        || person.adult === true
        || !Number.isSafeInteger(person.id)
        || person.id <= 0
        || typeof person.name !== 'string'
        || !person.name.trim()
        || seen.has(person.id)
      ) {
        return []
      }

      seen.add(person.id)

      const works = knownWorks(person)

      const knownForVotes = works.reduce(
        (sum, work) => (
          sum
          + positiveNumber(
            work.vote_count,
          )
        ),
        0,
      )

      const knownForPopularity =
        works.reduce(
          (sum, work) => (
            sum
            + positiveNumber(
              work.popularity,
            )
          ),
          0,
        )

      return [{
        person,
        sourceIndex,
        hasProfile: isTmdbImagePath(
          person.profile_path,
        ),
        popularity: positiveNumber(
          person.popularity,
        ),
        knownForVotes,
        knownForPopularity,
        knownForCoverage: Math.min(
          1,
          works.length / 3,
        ),
      }]
    },
  )

  if (!candidates.length) return []

  const maxima = {
    popularity: Math.max(
      0,
      ...candidates.map(
        item => item.popularity,
      ),
    ),
    knownForVotes: Math.max(
      0,
      ...candidates.map(
        item => item.knownForVotes,
      ),
    ),
    knownForPopularity: Math.max(
      0,
      ...candidates.map(
        item => item.knownForPopularity,
      ),
    ),
  }

  for (const candidate of candidates) {
    const personPopularity =
      normalizedLog(
        candidate.popularity,
        maxima.popularity,
      )

    const workVotes =
      normalizedLog(
        candidate.knownForVotes,
        maxima.knownForVotes,
      )

    const workPopularity =
      normalizedLog(
        candidate.knownForPopularity,
        maxima.knownForPopularity,
      )

    const profile =
      candidate.hasProfile
        ? 1
        : 0

    if (view === 'trending') {
      const trendSignal = (
        1
        / Math.sqrt(
          candidate.sourceIndex + 1,
        )
      )

      candidate.score = (
        (0.50 * trendSignal)
        + (0.15 * personPopularity)
        + (0.18 * workVotes)
        + (0.05 * workPopularity)
        + (0.09 * profile)
        + (
          0.03
          * candidate.knownForCoverage
        )
      )
    } else {
      candidate.score = (
        (0.20 * personPopularity)
        + (0.50 * workVotes)
        + (0.15 * workPopularity)
        + (0.10 * profile)
        + (
          0.05
          * candidate.knownForCoverage
        )
      )
    }
  }

  candidates.sort((a, b) => (
    Number(b.hasProfile)
      - Number(a.hasProfile)
    || b.score - a.score
    || a.sourceIndex - b.sourceIndex
    || a.person.id - b.person.id
  ))

  return candidates.map(
    candidate => candidate.person,
  )
}
