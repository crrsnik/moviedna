import { getOnboardingCounts, isValidMovieId, MAX_RESPONSES, MIN_OPINIONS, MIN_RESPONSES } from '../validation/onboardingValidation.js'

export const SWIPE_THRESHOLD = 80

export function prepareOnboardingDeck(movies, responses = []) {
  const seen = new Set(responses.map((response) => response.tmdbId))
  const deck = []
  for (const movie of Array.isArray(movies) ? movies : []) {
    if (!movie || !isValidMovieId(movie.id) || movie.mediaType !== 'movie' || typeof movie.title !== 'string' || !movie.title.trim() || seen.has(movie.id)) continue
    seen.add(movie.id)
    deck.push(movie)
    if (deck.length === 20) break
  }
  return deck
}

export function getDeckState(deck, responses) {
  const rated = new Set(responses.map((response) => response.tmdbId))
  const remainingMovies = deck.filter((movie) => !rated.has(movie.id))
  return { currentMovie: remainingMovies[0] ?? null, remainingMovies }
}

export function getOnboardingProgress(responses) {
  const counts = getOnboardingCounts(responses)
  const opinionatedCount = counts.likedCount + counts.dislikedCount
  return {
    ...counts, opinionatedCount,
    missingResponses: Math.max(0, MIN_RESPONSES - counts.responseCount),
    missingOpinions: Math.max(0, MIN_OPINIONS - opinionatedCount),
    canFinish: counts.responseCount >= MIN_RESPONSES && counts.responseCount <= MAX_RESPONSES && opinionatedCount >= MIN_OPINIONS,
  }
}

export function canReachMinimum(progress, available) {
  const capacity = Math.min(available, Math.max(0, MAX_RESPONSES - progress.responseCount))
  return capacity >= Math.max(progress.missingResponses, progress.missingOpinions)
}

export function getSwipeReaction(deltaX, deltaY = 0) {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return null
  return deltaX > 0 ? 'like' : 'dislike'
}

export function getKeyboardReaction(event) {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null
  return ({ ArrowLeft: 'dislike', ArrowRight: 'like', ArrowDown: 'skip' })[event.key] ?? null
}
