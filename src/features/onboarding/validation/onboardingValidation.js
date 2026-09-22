import { OnboardingError } from '../services/onboardingErrors.js'

export const MIN_RESPONSES = 10
export const MAX_RESPONSES = 30
export const MIN_OPINIONS = 5
export const REACTIONS = ['like', 'dislike', 'skip']

export function validateUid(uid) {
  if (typeof uid !== 'string' || !uid.trim() || uid !== uid.trim() || uid.includes('/') || ['.', '..'].includes(uid)) {
    throw new OnboardingError('invalid-input')
  }
  return uid
}

export function isValidMovieId(id) {
  return Number.isSafeInteger(id) && id > 0 && /^[1-9][0-9]{0,11}$/.test(String(id))
}

export function normalizeResponse({ tmdbId, mediaType, reaction, genreIds } = {}) {
  if (!isValidMovieId(tmdbId) || mediaType !== 'movie' || !REACTIONS.includes(reaction)
    || !Array.isArray(genreIds) || genreIds.length > 10
    || !genreIds.every((id) => Number.isSafeInteger(id) && id > 0)) {
    throw new OnboardingError('invalid-input')
  }
  return { tmdbId, mediaType: 'movie', reaction, genreIds: [...new Set(genreIds)] }
}

export function getOnboardingCounts(responses) {
  if (!Array.isArray(responses)) throw new OnboardingError('invalid-data')
  const counts = { responseCount: responses.length, likedCount: 0, dislikedCount: 0, skippedCount: 0 }
  const seen = new Set()
  for (const response of responses) {
    if (!response) throw new OnboardingError('invalid-data')
    const normalized = normalizeResponse(response)
    if (seen.has(normalized.tmdbId)) throw new OnboardingError('invalid-data')
    seen.add(normalized.tmdbId)
    if (normalized.reaction === 'like') counts.likedCount++
    else if (normalized.reaction === 'dislike') counts.dislikedCount++
    else counts.skippedCount++
  }
  return counts
}

export function validateCompletionCounts(counts) {
  const { responseCount, likedCount, dislikedCount, skippedCount } = counts
  if (![responseCount, likedCount, dislikedCount, skippedCount].every((n) => Number.isSafeInteger(n) && n >= 0)
    || likedCount + dislikedCount + skippedCount !== responseCount) throw new OnboardingError('invalid-data')
  if (responseCount < MIN_RESPONSES || responseCount > MAX_RESPONSES) throw new OnboardingError('insufficient-responses')
  if (likedCount + dislikedCount < MIN_OPINIONS) throw new OnboardingError('insufficient-opinions')
  return counts
}
