import { OnboardingError } from '../services/onboardingErrors.js'

export const MIN_RESPONSES = 10
export const MAX_RESPONSES = 30
export const MIN_OPINIONS = 5
export const REACTIONS = ['like', 'dislike', 'skip']
export const ONBOARDING_MEDIA_TYPES = ['movie', 'tv']

export function validateUid(uid) {
  if (typeof uid !== 'string' || !uid.trim() || uid !== uid.trim() || uid.includes('/') || ['.', '..'].includes(uid)) {
    throw new OnboardingError('invalid-input')
  }
  return uid
}

export function isValidMovieId(id) {
  return Number.isSafeInteger(id) && id > 0 && /^[1-9][0-9]{0,11}$/.test(String(id))
}

export function getOnboardingMediaKey(mediaType, tmdbId) {
  if (!ONBOARDING_MEDIA_TYPES.includes(mediaType) || !isValidMovieId(tmdbId)) {
    return null
  }

  return `${mediaType}_${tmdbId}`
}

export function normalizeResponse({ tmdbId, mediaType, reaction, genreIds } = {}) {
  if (!getOnboardingMediaKey(mediaType, tmdbId) || !REACTIONS.includes(reaction)
    || !Array.isArray(genreIds) || genreIds.length > 10
    || !genreIds.every((id) => Number.isSafeInteger(id) && id > 0)) {
    throw new OnboardingError('invalid-input')
  }
  return { tmdbId, mediaType, reaction, genreIds: [...new Set(genreIds)] }
}

export function getOnboardingCounts(responses) {
  if (!Array.isArray(responses)) throw new OnboardingError('invalid-data')
  const counts = { responseCount: responses.length, likedCount: 0, dislikedCount: 0, skippedCount: 0 }
  const seen = new Set()
  for (const response of responses) {
    if (!response) throw new OnboardingError('invalid-data')
    const normalized = normalizeResponse(response)
    const mediaKey = getOnboardingMediaKey(
      normalized.mediaType,
      normalized.tmdbId,
    )
    if (seen.has(mediaKey)) throw new OnboardingError('invalid-data')
    seen.add(mediaKey)
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
