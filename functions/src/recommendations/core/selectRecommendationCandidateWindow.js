const MEDIA_TYPES = ['movie', 'tv']
const DEFAULT_SEED_SHARE = 0.40

function validLimit(value) {
  return Number.isSafeInteger(value)
    && value > 0
    && value <= 500
}

function validShare(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= 1
}

function affinityFor(
  candidate,
  seedAffinity,
) {
  const value =
    seedAffinity.get(
      candidate.mediaKey,
    )?.affinity

  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value > 0
  )
    ? Math.min(1, value)
    : 0
}

function compareGeneric(a, b) {
  return (
    b.popularity - a.popularity
    || a.mediaKey.localeCompare(
      b.mediaKey,
    )
  )
}

function compareSeeded(
  a,
  b,
  seedAffinity,
) {
  return (
    affinityFor(
      b,
      seedAffinity,
    )
    - affinityFor(
      a,
      seedAffinity,
    )
    || compareGeneric(a, b)
  )
}

export function selectRecommendationCandidateWindow({
  candidates,
  seedAffinity = new Map(),
  maxPerMediaType,
  seedShare = DEFAULT_SEED_SHARE,
} = {}) {
  if (
    !Array.isArray(candidates)
    || !(seedAffinity instanceof Map)
    || !validLimit(maxPerMediaType)
    || !validShare(seedShare)
  ) {
    throw new TypeError(
      'Invalid recommendation candidate window.',
    )
  }

  const selected = []

  for (const mediaType of MEDIA_TYPES) {
    const sameType =
      candidates.filter(
        candidate =>
          candidate?.mediaType
            === mediaType,
      )

    const seeded = sameType
      .filter(
        candidate =>
          affinityFor(
            candidate,
            seedAffinity,
          ) > 0,
      )
      .sort(
        (a, b) =>
          compareSeeded(
            a,
            b,
            seedAffinity,
          ),
      )

    const generic = sameType
      .filter(
        candidate =>
          affinityFor(
            candidate,
            seedAffinity,
          ) === 0,
      )
      .sort(compareGeneric)

    const seedReserve =
      Math.min(
        seeded.length,
        Math.ceil(
          maxPerMediaType
            * seedShare,
        ),
      )

    const chosenSeeded =
      seeded.slice(
        0,
        seedReserve,
      )

    const genericCapacity =
      maxPerMediaType
      - chosenSeeded.length

    const chosenGeneric =
      generic.slice(
        0,
        genericCapacity,
      )

    const remainingCapacity =
      maxPerMediaType
      - chosenSeeded.length
      - chosenGeneric.length

    const seedBackfill =
      remainingCapacity > 0
        ? seeded.slice(
            seedReserve,
            seedReserve
              + remainingCapacity,
          )
        : []

    selected.push(
      ...chosenSeeded,
      ...chosenGeneric,
      ...seedBackfill,
    )
  }

  return Object.freeze(selected)
}

export {
  DEFAULT_SEED_SHARE as RECOMMENDATION_SEED_CANDIDATE_SHARE,
}
