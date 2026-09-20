export function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim().toLowerCase() : ''
}

export function validateRegistration({ username, displayName, email, password, confirmPassword }) {
  const errors = {}

  if (!/^[a-z0-9_]{3,20}$/.test(normalizeUsername(username))) {
    errors.username = 'Use 3–20 lowercase letters, numbers, or underscores.'
  }
  if (typeof displayName !== 'string' || displayName.trim().length < 1 || displayName.trim().length > 50) {
    errors.displayName = 'Enter a display name of 1–50 characters.'
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    errors.password = 'Use a password of 8–128 characters.'
  }
  if (typeof confirmPassword !== 'string' || confirmPassword.length === 0) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords must match.'
  }

  return errors
}
