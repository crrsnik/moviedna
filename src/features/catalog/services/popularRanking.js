const WEIGHTS = Object.freeze({
  popularity: 0.65,
  votes: 0.25,
  trending: 0.10,
})

const AUDIENCE_CONFIDENCE_TARGET = Object.freeze({
  movie: 5000,
  tv: 2000,
})

function finiteNonNegative(value) {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
  )
}

function validItem(item, type) {
  return (
    item
    && typeof item === 'object'
    && item.mediaType === type
    && Number.isSafeInteger(item.id)
    && item.id > 0
    && typeof item.posterPath === 'string'
    && item.posterPath.length > 0
    && finiteNonNegative(item.popularity)
    && Number.isSafeInteger(item.voteCount)
    && item.voteCount >= 0
  )
}

function logarithmicSignal(value, maximum) {
  if (
    maximum <= 0
    || value <= 0
  ) {
    return 0
  }

  return (
    Math.log1p(value)
    / Math.log1p(maximum)
  )
}

function audienceConfidence(
  voteCount,
  type,
) {
  const target =
    AUDIENCE_CONFIDENCE_TARGET[type]

  const evidence = Math.min(
    1,
    logarithmicSignal(
      voteCount,
      target,
    ),
  )

  /*
   * Never hard-block a new release just because
   * it has not accumulated many votes yet.
   *
   * Low-evidence titles keep 55% of their score,
   * while established titles approach 100%.
   */
  return 0.55 + (0.45 * evidence)
}

function trendingSignals(ids) {
  const unique = []
  const seen = new Set()

  for (const id of ids) {
    if (
      Number.isSafeInteger(id)
      && id > 0
      && !seen.has(id)
    ) {
      seen.add(id)
      unique.push(id)
    }
  }

  const total = unique.length

  return new Map(
    unique.map((id, index) => [
      id,
      total
        ? (total - index) / total
        : 0,
    ]),
  )
}

export function rankPopularResults(
  items,
  type,
  {
    trendingIds = [],
  } = {},
) {
  if (
    !['movie', 'tv'].includes(type)
    || !Array.isArray(items)
    || !Array.isArray(trendingIds)
  ) {
    return []
  }

  const unique = []
  const seen = new Set()

  for (const item of items) {
    if (
      !validItem(item, type)
      || seen.has(item.id)
    ) {
      continue
    }

    seen.add(item.id)
    unique.push(item)
  }

  const maxPopularity = Math.max(
    0,
    ...unique.map(
      item => item.popularity,
    ),
  )

  const maxVotes = Math.max(
    0,
    ...unique.map(
      item => item.voteCount,
    ),
  )

  const trending =
    trendingSignals(trendingIds)

  return unique
    .map(item => {
      const popularitySignal =
        logarithmicSignal(
          item.popularity,
          maxPopularity,
        )

      const voteSignal =
        logarithmicSignal(
          item.voteCount,
          maxVotes,
        )

      const trendingSignal =
        trending.get(item.id) ?? 0

      const baseScore = (
        WEIGHTS.popularity
          * popularitySignal
        + WEIGHTS.votes
          * voteSignal
        + WEIGHTS.trending
          * trendingSignal
      )

      const score = (
        baseScore
        * audienceConfidence(
          item.voteCount,
          type,
        )
      )

      return {
        item,
        score,
        trendingSignal,
      }
    })
    .sort((a, b) => (
      b.score - a.score
      || b.trendingSignal
        - a.trendingSignal
      || b.item.voteCount
        - a.item.voteCount
      || b.item.popularity
        - a.item.popularity
      || a.item.id - b.item.id
    ))
    .map(({ item }) => item)
}
