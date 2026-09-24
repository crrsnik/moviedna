const messages = {
  unauthenticated: 'Please log in again to use your library.',
  'permission-denied': 'Your library is not available for this account.',
  unavailable: 'Your library is temporarily unavailable. Please try again.',
  network: 'Check your connection and try again.',
  aborted: 'The operation was interrupted. Please check your library before trying again.',
  session: 'Your session changed. Please log in again.',
  'invalid-media': 'This title cannot be saved.',
  'invalid-data': 'This saved item could not be loaded safely.',
  pending: 'Please wait for the current save to finish.',
  unknown: 'Something went wrong with your library. Please try again.',
}
export class LibraryError extends Error {
  constructor(code = 'unknown') {
    const safeCode = Object.hasOwn(messages, code) ? code : 'unknown'
    super(messages[safeCode]); this.name = 'LibraryError'; this.code = safeCode
  }
}
export function toLibraryError(error) {
  if (error instanceof LibraryError) return error
  const code = String(error?.code ?? '').replace(/^firestore\//, '')
  if (['auth/network-request-failed', 'network-request-failed', 'deadline-exceeded'].includes(code)) return new LibraryError('network')
  if (error?.name === 'AbortError' || code === 'cancelled') return new LibraryError('aborted')
  return new LibraryError(code)
}
