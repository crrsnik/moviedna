const HEAD_SIZE = 20
const MAINSTREAM_QUOTA = 15

// Seed affinity changes recommendation order only.
// It deliberately does not change the displayed DNA match score.
const SEED_PERSONAL_MAX_BOOST = 22
const SEED_MAINSTREAM_MAX_BOOST = 0.20


function positiveInteger(value) {
  return Number.isSafeInteger(value)
    && value > 0
}


function clamp01(value) {
  return Math.max(
    0,
    Math.min(1, value),
  )
}


function seedAffinitySignal(
  result,
  seedAffinity,
) {
  const value =
    seedAffinity?.get?.(
      result?.mediaKey,
    )?.affinity

  return (
    typeof value === 'number'
    && Number.isFinite(value)
  )
    ? clamp01(value)
    : 0
}


function genreContribution(result) {
  return result.breakdown?.find(
    entry => entry.dimension === 'genres',
  )?.contribution ?? 0
}


function collectionId(candidate) {
  const value =
    candidate?.metadata?.collectionId

  return positiveInteger(value)
    ? value
    : null
}


function genreIds(candidate) {
  const values =
    candidate?.metadata?.genres

  if (!Array.isArray(values)) return []

  return [
    ...new Set(
      values
        .map(value => (
          positiveInteger(value?.id)
            ? value.id
            : positiveInteger(value)
              ? value
              : null
        ))
        .filter(Boolean),
    ),
  ]
}


function creativePeople(candidate) {
  const metadata =
    candidate?.metadata ?? {}

  const values = [
    ...(Array.isArray(metadata.directors)
      ? metadata.directors
      : []),
    ...(Array.isArray(metadata.creators)
      ? metadata.creators
      : []),
  ]

  return new Set(
    values
      .map(value => (
        positiveInteger(value?.id)
          ? value.id
          : positiveInteger(value)
            ? value
            : null
      ))
      .filter(Boolean),
  )
}


function genreOverlap(a, b) {
  const left = new Set(genreIds(a))
  const right = new Set(genreIds(b))

  if (!left.size || !right.size) {
    return 0
  }

  let overlap = 0

  for (const id of left) {
    if (right.has(id)) {
      overlap += 1
    }
  }

  return (
    overlap
    / Math.min(
      left.size,
      right.size,
    )
  )
}


function sharesCreativePerson(a, b) {
  const left = creativePeople(a)
  const right = creativePeople(b)

  for (const id of left) {
    if (right.has(id)) {
      return true
    }
  }

  return false
}


function tooSimilar(a, b) {
  if (!a || !b) return false

  return (
    a.mediaType === b.mediaType
    && genreOverlap(a, b) >= 0.75
    && sharesCreativePerson(a, b)
  )
}


function mainstreamThreshold(candidate) {
  if (candidate.mediaType === 'movie') {
    return {
      votes: 5000,
      rating: 6.8,
    }
  }

  return {
    votes: 1500,
    rating: 7,
  }
}


function isMainstreamQuality(
  result,
  candidate,
) {
  if (!candidate) return false

  const threshold =
    mainstreamThreshold(candidate)

  return (
    Number.isSafeInteger(
      candidate.voteCount,
    )
    && candidate.voteCount
      >= threshold.votes
    && typeof candidate.voteAverage
      === 'number'
    && Number.isFinite(
      candidate.voteAverage,
    )
    && candidate.voteAverage
      >= threshold.rating
    && result.score >= 52
    && genreContribution(result) >= 0.08
  )
}


function popularitySignal(candidate) {
  const popularity = (
    typeof candidate?.popularity === 'number'
    && Number.isFinite(candidate.popularity)
    && candidate.popularity > 0
  )
    ? candidate.popularity
    : 0

  return Math.min(
    1,
    Math.log10(popularity + 1)
      / Math.log10(201),
  )
}


function voteSignal(candidate) {
  return Math.min(
    1,
    Math.log10(
      (candidate?.voteCount ?? 0) + 1,
    ) / 5,
  )
}


function ratingSignal(candidate) {
  if (
    typeof candidate?.voteAverage
      !== 'number'
    || !Number.isFinite(
      candidate.voteAverage,
    )
  ) {
    return 0
  }

  return clamp01(
    (
      candidate.voteAverage
      - 6.5
    ) / 2.5,
  )
}


function mainstreamRank(
  result,
  candidate,
  seedAffinity,
) {
  // Keep the existing mainstream formula intact and
  // add a bounded title-to-title affinity boost.
  return (
    0.50 * (result.score / 100)
    + 0.25 * voteSignal(candidate)
    + 0.20 * ratingSignal(candidate)
    + 0.05 * popularitySignal(candidate)
    + SEED_MAINSTREAM_MAX_BOOST
      * seedAffinitySignal(
        result,
        seedAffinity,
      )
  )
}


function personalRank(
  result,
  seedAffinity,
) {
  return (
    result.score
    + SEED_PERSONAL_MAX_BOOST
      * seedAffinitySignal(
        result,
        seedAffinity,
      )
  )
}


function comparePersonal(
  a,
  b,
  seedAffinity,
) {
  return (
    personalRank(
      b,
      seedAffinity,
    )
    - personalRank(
      a,
      seedAffinity,
    )
    || b.score - a.score
    || (
      b.profileEvidenceCoverage
      - a.profileEvidenceCoverage
    )
    || b.popularity - a.popularity
    || a.mediaKey.localeCompare(
      b.mediaKey,
    )
  )
}


function candidateFor(
  result,
  candidateByMediaKey,
) {
  return candidateByMediaKey.get(
    result.mediaKey,
  )
}


function pickDiverse(
  list,
  {
    selected,
    usedCollections,
    previous,
    candidateByMediaKey,
  },
) {
  // First pass: avoid both franchise repeats
  // and a very similar adjacent recommendation.
  for (const result of list) {
    if (selected.has(result.mediaKey)) {
      continue
    }

    const candidate = candidateFor(
      result,
      candidateByMediaKey,
    )

    const franchise =
      collectionId(candidate)

    if (
      franchise !== null
      && usedCollections.has(franchise)
    ) {
      continue
    }

    if (
      previous
      && tooSimilar(
        candidate,
        candidateFor(
          previous,
          candidateByMediaKey,
        ),
      )
    ) {
      continue
    }

    return result
  }

  // Second pass: adjacency may repeat,
  // but franchise still may not.
  for (const result of list) {
    if (selected.has(result.mediaKey)) {
      continue
    }

    const candidate = candidateFor(
      result,
      candidateByMediaKey,
    )

    const franchise =
      collectionId(candidate)

    if (
      franchise !== null
      && usedCollections.has(franchise)
    ) {
      continue
    }

    return result
  }

  return null
}


export function rerankRecommendationResults({
  rankedResults,
  candidates,
  seedAffinity = new Map(),
} = {}) {
  if (
    !Array.isArray(rankedResults)
    || !Array.isArray(candidates)
  ) {
    throw new TypeError(
      'Recommendation reranking requires arrays.',
    )
  }

  const candidateByMediaKey = new Map(
    candidates.map(candidate => [
      candidate.mediaKey,
      candidate,
    ]),
  )

  // Ignore any previous quota ordering and rebuild
  // from stable recommendation scores.
  const personal = [
    ...rankedResults,
  ].sort(
    (a, b) => comparePersonal(
      a,
      b,
      seedAffinity,
    ),
  )

  const mainstream = personal
    .filter(result => (
      isMainstreamQuality(
        result,
        candidateFor(
          result,
          candidateByMediaKey,
        ),
      )
    ))
    .sort((a, b) => {
      const difference = (
        mainstreamRank(
          b,
          candidateFor(
            b,
            candidateByMediaKey,
          ),
          seedAffinity,
        )
        - mainstreamRank(
          a,
          candidateFor(
            a,
            candidateByMediaKey,
          ),
          seedAffinity,
        )
      )

      return (
        difference
        || comparePersonal(
          a,
          b,
          seedAffinity,
        )
      )
    })

  const discovery = personal.filter(
    result => (
      !isMainstreamQuality(
        result,
        candidateFor(
          result,
          candidateByMediaKey,
        ),
      )
    ),
  )

  const selected = new Set()
  const usedCollections = new Set()
  const head = []

  let mainstreamCount = 0

  const limit = Math.min(
    HEAD_SIZE,
    personal.length,
  )

  for (
    let position = 0;
    position < limit;
    position += 1
  ) {
    // 3 mainstream slots, then 1 discovery slot.
    // Across 20 cards this produces up to 15/20.
    const mainstreamSlot = (
      position % 4 !== 3
      && mainstreamCount
        < MAINSTREAM_QUOTA
    )

    const primary = mainstreamSlot
      ? mainstream
      : discovery

    const secondary = mainstreamSlot
      ? discovery
      : mainstream

    const context = {
      selected,
      usedCollections,
      previous:
        head[head.length - 1] ?? null,
      candidateByMediaKey,
    }

    let picked = pickDiverse(
      primary,
      context,
    )

    if (!picked) {
      picked = pickDiverse(
        secondary,
        context,
      )
    }

    // Only if every remaining title belongs to an
    // already used franchise do we relax diversity.
    if (!picked) {
      picked = personal.find(
        result => (
          !selected.has(
            result.mediaKey,
          )
        ),
      ) ?? null
    }

    if (!picked) break

    selected.add(picked.mediaKey)

    const candidate = candidateFor(
      picked,
      candidateByMediaKey,
    )

    const franchise =
      collectionId(candidate)

    if (franchise !== null) {
      usedCollections.add(franchise)
    }

    if (
      isMainstreamQuality(
        picked,
        candidate,
      )
    ) {
      mainstreamCount += 1
    }

    head.push(picked)
  }

  return Object.freeze([
    ...head,
    ...personal.filter(
      result => (
        !selected.has(
          result.mediaKey,
        )
      ),
    ),
  ])
}
