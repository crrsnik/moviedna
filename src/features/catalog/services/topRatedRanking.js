const CONFIG = Object.freeze({
  movie: {
    baseline: 6.8,
    confidenceVotes: 20000,
    voteBoost: 0.32,
  },
  tv: {
    baseline: 7.2,
    confidenceVotes: 30000,
    voteBoost: 0.40,
  },
})


function safeRating(item) {
  return (
    typeof item?.voteAverage === 'number'
    && Number.isFinite(item.voteAverage)
    && item.voteAverage >= 0
    && item.voteAverage <= 10
  )
    ? item.voteAverage
    : 0
}


function safeVotes(item) {
  return (
    Number.isSafeInteger(item?.voteCount)
    && item.voteCount >= 0
  )
    ? item.voteCount
    : 0
}


function safePopularity(item) {
  return (
    typeof item?.popularity === 'number'
    && Number.isFinite(item.popularity)
    && item.popularity >= 0
  )
    ? item.popularity
    : 0
}


export function topRatedScore(
  item,
  mediaType,
) {
  const config = CONFIG[mediaType]

  if (!config) return 0

  const rating = safeRating(item)
  const votes = safeVotes(item)

  const weight = (
    votes
    / (
      votes
      + config.confidenceVotes
    )
  )

  const confidenceScore = (
    weight * rating
    + (1 - weight) * config.baseline
  )

  const evidenceBoost = (
    Math.log10(votes + 1)
    * config.voteBoost
  )

  return (
    confidenceScore
    + evidenceBoost
  )
}


const ESTABLISHED_MIN_VOTES = Object.freeze({
  movie: 10000,
  tv: 5000,
})

const ESTABLISHED_HEAD_SIZE = 100
const ESTABLISHED_CADENCE = 5


function isEstablished(
  item,
  mediaType,
) {
  return (
    safeVotes(item)
    >= ESTABLISHED_MIN_VOTES[mediaType]
  )
}


function interleaveEstablished(
  ranked,
  mediaType,
) {
  const established = ranked.filter(
    item => isEstablished(
      item,
      mediaType,
    ),
  )

  const discovery = ranked.filter(
    item => !isEstablished(
      item,
      mediaType,
    ),
  )

  const result = []

  let establishedIndex = 0
  let discoveryIndex = 0

  while (
    result.length < ESTABLISHED_HEAD_SIZE
    && (
      establishedIndex
        < established.length
      || discoveryIndex
        < discovery.length
    )
  ) {
    for (
      let slot = 0;
      slot < ESTABLISHED_CADENCE - 1;
      slot += 1
    ) {
      if (
        establishedIndex
        >= established.length
      ) {
        break
      }

      result.push(
        established[establishedIndex],
      )

      establishedIndex += 1

      if (
        result.length
        >= ESTABLISHED_HEAD_SIZE
      ) {
        break
      }
    }

    if (
      result.length
        < ESTABLISHED_HEAD_SIZE
      && discoveryIndex
        < discovery.length
    ) {
      result.push(
        discovery[discoveryIndex],
      )

      discoveryIndex += 1
    }

    // If one bucket is exhausted, keep filling
    // from the other rather than shortening the head.
    if (
      establishedIndex
        >= established.length
      && discoveryIndex
        < discovery.length
      && result.length
        < ESTABLISHED_HEAD_SIZE
    ) {
      result.push(
        discovery[discoveryIndex],
      )

      discoveryIndex += 1
    }
  }

  const used = new Set(
    result.map(
      item => `${item.mediaType}:${item.id}`,
    ),
  )

  return [
    ...result,
    ...ranked.filter(
      item => !used.has(
        `${item.mediaType}:${item.id}`,
      ),
    ),
  ]
}


export function rankTopRatedResults(
  results,
  mediaType,
) {
  if (!Array.isArray(results)) {
    throw new TypeError(
      'Top Rated results must be an array.',
    )
  }

  if (!CONFIG[mediaType]) {
    return [...results]
  }

  const ranked = [...results].sort((a, b) => (
    topRatedScore(b, mediaType)
      - topRatedScore(a, mediaType)
    || safeVotes(b) - safeVotes(a)
    || safeRating(b) - safeRating(a)
    || safePopularity(b)
      - safePopularity(a)
    || a.id - b.id
  ))

  return interleaveEstablished(
    ranked,
    mediaType,
  )
}
