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
  'invalid-list-input': 'Enter a name of 1–60 characters and a description of up to 300 characters.',
  'invalid-list-id': 'This list address is invalid. Please return to your library.',
  'invalid-list-data': 'This list could not be loaded safely.',
  'list-not-found': 'This list no longer exists. Refresh your lists before saving again.',
  'membership-limit': 'Choose no more than 20 lists for this title.',
  'partial-cleanup': 'The list could not be fully cleared. Some items may already be removed. Please try deleting it again.',
  'concurrent-deletion': 'A list is being deleted. Please wait before changing your library.',
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
