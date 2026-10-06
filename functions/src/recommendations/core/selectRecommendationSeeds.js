const MAX_SEEDS = 12

const RATING_WEIGHTS = Object.freeze({
  10: 1,
  9: 0.85,
  8: 0.65,
})

const LIKE_WEIGHT = 0.75

function positiveInteger(value) {
  return Number.isSafeInteger(value)
    && value > 0
}

function validMediaType(value) {
  return value === 'movie'
    || value === 'tv'
}

function seedFromSignal(value) {
  if (
    !value
    || typeof value !== 'object'
    || !positiveInteger(value.tmdbId)
    || !validMediaType(value.mediaType)
  ) {
    return null
  }

  const mediaKey =
    `${value.mediaType}_${value.tmdbId}`

  if (
    Number.isInteger(value.rating)
    && Object.hasOwn(
      RATING_WEIGHTS,
      value.rating,
    )
  ) {
    return Object.freeze({
      mediaKey,
      tmdbId: value.tmdbId,
      mediaType: value.mediaType,
      rating: value.rating,
      weight:
        RATING_WEIGHTS[value.rating],
    })
  }

  if (value.reaction === 'like') {
    return Object.freeze({
      mediaKey,
      tmdbId: value.tmdbId,
      mediaType: value.mediaType,
      rating: null,
      weight: LIKE_WEIGHT,
    })
  }

  return null
}

function explicitRating(seed) {
  return Number.isInteger(
    seed.rating,
  )
}

function shouldReplace(
  existing,
  next,
) {
  if (
    explicitRating(next)
    !== explicitRating(existing)
  ) {
    return explicitRating(next)
  }

  return next.weight > existing.weight
}

export function selectRecommendationSeeds(
  signals,
  {
    limit = MAX_SEEDS,
  } = {},
) {
  if (
    !Array.isArray(signals)
    || !Number.isSafeInteger(limit)
    || limit < 1
  ) {
    return []
  }

  const byMediaKey = new Map()

  for (const value of signals) {
    const seed =
      seedFromSignal(value)

    if (!seed) continue

    const existing =
      byMediaKey.get(seed.mediaKey)

    if (
      !existing
      || shouldReplace(
        existing,
        seed,
      )
    ) {
      byMediaKey.set(
        seed.mediaKey,
        seed,
      )
    }
  }

  return [...byMediaKey.values()]
    .sort((a, b) => (
      b.weight - a.weight
      || (
        explicitRating(b)
        - explicitRating(a)
      )
      || a.mediaKey.localeCompare(
        b.mediaKey,
      )
    ))
    .slice(0, limit)
}

export {
  LIKE_WEIGHT as RECOMMENDATION_LIKE_SEED_WEIGHT,
  MAX_SEEDS as RECOMMENDATION_MAX_SEEDS,
}
