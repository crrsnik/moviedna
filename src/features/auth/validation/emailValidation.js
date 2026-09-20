export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim() : ''
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}
