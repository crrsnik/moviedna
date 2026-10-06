import { normalizeTmdbDiscoveryCandidate } from './prepareRecommendationCandidates.js'
import {
  RECOMMENDATION_ERROR_CODES,
  throwRecommendationError,
} from './recommendationErrors.js'

const MEDIA_TYPES = ['movie', 'tv']
const DEFAULT_MAX_PER_MEDIA_TYPE = 120
const MAX_PER_MEDIA_TYPE = 500

function validLimit(value) {
  return Number.isSafeInteger(value)
    && value > 0
    && value <= MAX_PER_MEDIA_TYPE
}

function candidateTitle(value) {
  return value.title ?? ''
}

function preferredDuplicate(current, next) {
  if (!current) return next

  if (next.popularity !== current.popularity) {
    return next.popularity > current.popularity ? next : current
  }

  const currentTitle = candidateTitle(current)
  const nextTitle = candidateTitle(next)

  if (currentTitle !== nextTitle) {
    if (!currentTitle) return next
    if (!nextTitle) return current

    return nextTitle.localeCompare(currentTitle) < 0
      ? next
      : current
  }

  return current
}

function compareCandidates(a, b) {
  return b.popularity - a.popularity
    || a.mediaKey.localeCompare(b.mediaKey)
}

export function buildRecommendationCandidatePool({
  sources,
  maxPerMediaType = DEFAULT_MAX_PER_MEDIA_TYPE,
} = {}) {
  if (!Array.isArray(sources) || !validLimit(maxPerMediaType)) {
    throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
  }

  const unique = new Map()
  let inputCount = 0
  let rejectedCount = 0
  let duplicateCount = 0

  for (const source of sources) {
    if (
      !source
      || !MEDIA_TYPES.includes(source.mediaType)
      || !Array.isArray(source.results)
    ) {
      throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
    }

    for (const rawCandidate of source.results) {
      inputCount += 1

      const candidate = normalizeTmdbDiscoveryCandidate(
        rawCandidate,
        source.mediaType,
      )

      if (!candidate) {
        rejectedCount += 1
        continue
      }

      const existing = unique.get(candidate.mediaKey)

      if (existing) duplicateCount += 1

      unique.set(
        candidate.mediaKey,
        preferredDuplicate(existing, candidate),
      )
    }
  }

  const byMediaType = Object.fromEntries(
    MEDIA_TYPES.map((mediaType) => [
      mediaType,
      [...unique.values()]
        .filter((candidate) => candidate.mediaType === mediaType)
        .sort(compareCandidates),
    ]),
  )

  const accepted = MEDIA_TYPES.flatMap((mediaType) => (
    byMediaType[mediaType].slice(0, maxPerMediaType)
  ))

  const trimmedCount = unique.size - accepted.length

  return Object.freeze({
    candidates: Object.freeze(accepted),
    inputCount,
    rejectedCount,
    duplicateCount,
    trimmedCount,
  })
}
