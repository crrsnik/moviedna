const messages = {
  'invalid-input': 'Please check the movie response and try again.',
  'invalid-data': "We couldn't read your saved progress. Please refresh the page. No changes were made.",
  'insufficient-responses': 'Rate or skip at least 10 movies before finishing (up to 30 total).',
  'insufficient-opinions': 'Like or dislike at least 5 movies before finishing.',
  'already-completed': 'Onboarding is already complete. Please refresh the page.',
  'permission-denied': "We couldn't save your progress. Please refresh the page and try again.",
  unauthenticated: 'Your session has changed. Please log in again.',
  unavailable: 'Your connection is unavailable. Please try again when you are online.',
  'deadline-exceeded': 'The request took too long. Please check your connection and try again.',
  aborted: 'Your progress changed while saving. Please try again.',
  'failed-precondition': "We couldn't save your progress right now. Please refresh the page.",
  unknown: "We couldn't update your onboarding. Please try again.",
}

export class OnboardingError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(messages, code) ? code : 'unknown'
    super(messages[safeCode])
    this.name = 'OnboardingError'
    this.code = safeCode
  }
}

export function toOnboardingError(error) {
  const code = error?.code === 'auth/network-request-failed' ? 'unavailable' : error?.code
  return new OnboardingError(code)
}

export function getOnboardingErrorMessage(error) {
  return toOnboardingError(error).message
}
