const messages = {
  unauthenticated: 'Please log in again to manage your ratings.',
  'incomplete-profile': 'Complete your profile and onboarding before rating a title.',
  'permission-denied': 'Your rating could not be accessed. Check your account and onboarding status.',
  unavailable: 'Ratings are temporarily unavailable. Please try again.',
  network: 'Check your connection and try again.',
  'invalid-score': 'Choose a whole-number rating from 1 to 10.',
  'invalid-media': 'This title cannot be rated.',
  'corrupted-rating': 'This rating could not be loaded safely.',
  'identity-mismatch': 'This rating does not match the selected title.',
  session: 'Your session changed. Please log in again.',
  aborted: 'The operation was interrupted. Check your rating before trying again.',
  pending: 'Please wait for the current rating operation to finish.',
  unknown: 'Something went wrong with your rating. Please try again.',
}
export class RatingError extends Error {
  constructor(code = 'unknown') {
    const safe = Object.hasOwn(messages, code) ? code : 'unknown'
    super(messages[safe]); this.name = 'RatingError'; this.code = safe
  }
}
export function toRatingError(error) {
  if (error instanceof RatingError) return error
  const code = String(error?.code ?? '').replace(/^firestore\//, '')
  if (['auth/network-request-failed', 'network-request-failed', 'deadline-exceeded'].includes(code)) return new RatingError('network')
  if (error?.name === 'AbortError' || code === 'cancelled') return new RatingError('aborted')
  return new RatingError(code)
}
