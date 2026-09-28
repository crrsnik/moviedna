const messages = {
  unauthenticated: 'Please log in to manage your comment.',
  profile: 'A valid completed profile is required to manage comments.',
  session: 'Your session changed. Please try again.',
  'invalid-media': 'Comments are unavailable for this title.',
  'invalid-text': 'Enter a comment between 1 and 2000 characters.',
  'invalid-spoiler': 'Choose whether your comment contains spoilers.',
  'invalid-data': 'This comment could not be loaded safely.',
  'identity-mismatch': 'This comment does not match the selected title.',
  'permission-denied': 'You do not have permission to perform this action.',
  unavailable: 'Comments are temporarily unavailable. Please try again.',
  pending: 'Please wait for the current action to finish.',
  unknown: 'Something went wrong with comments. Please try again.',
}
export class CommentError extends Error {
  constructor(code) { super(messages[code] ?? messages.unknown); this.name = 'CommentError'; this.code = messages[code] ? code : 'unknown' }
}
export function toCommentError(error) {
  if (error instanceof CommentError) return error
  const code = typeof error?.code === 'string' ? error.code.replace(/^firestore\//, '') : null
  if (['invalid-argument', 'data-loss'].includes(code)) return new CommentError('invalid-data')
  if (code === 'unauthenticated' || code === 'permission-denied') return new CommentError(code)
  if (['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code)) return new CommentError('unavailable')
  if (['cancelled', 'aborted'].includes(code) || error?.name === 'AbortError') return new CommentError('session')
  return new CommentError('unknown')
}
