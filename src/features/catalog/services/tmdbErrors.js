const messages = {
  request: "We couldn't load this catalog request. Please try again.",
  access: 'The catalog is unavailable right now. Please try again later.',
  missing: 'This catalog could not be found. Please try again later.',
  limit: 'The catalog is busy. Please wait a moment and try again.',
  server: 'The catalog is temporarily unavailable. Please try again.',
  network: "We couldn't reach the catalog. Check your connection and try again.",
  invalid: "We couldn't read the catalog. Please try again.",
  unknown: "We couldn't load the catalog. Please try again.",
}

export class TmdbError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(messages, code) ? code : 'unknown'
    super(messages[safeCode])
    this.name = 'TmdbError'
    this.code = safeCode
  }
}

export function getTmdbErrorMessage(error) {
  return error instanceof TmdbError ? new TmdbError(error.code).message : messages.unknown
}

export function isTmdbAbort(error) {
  return error?.name === 'AbortError'
}
