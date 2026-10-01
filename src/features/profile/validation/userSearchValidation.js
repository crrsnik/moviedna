const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export function normalizeUserSearchQuery(value) {
  if (typeof value !== 'string') return ''

  const normalized = value
    .normalize('NFC')
    .trim()
    .toLowerCase()

  return normalized.startsWith('@')
    ? normalized.slice(1)
    : normalized
}

export function getUserSearchError(value) {
  const username = normalizeUserSearchQuery(value)

  if (!username) {
    return 'Enter a username.'
  }

  if (!USERNAME_PATTERN.test(username)) {
    return 'Use 3–20 letters, numbers or underscores.'
  }

  return null
}

export function createUserSearchParams(value) {
  return new URLSearchParams({
    q: normalizeUserSearchQuery(value),
  })
}
