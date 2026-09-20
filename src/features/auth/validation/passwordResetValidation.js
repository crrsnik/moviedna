import { isValidEmail, normalizeEmail } from './emailValidation.js'

export function validatePasswordReset({ email }) {
  const values = { email: normalizeEmail(email) }
  const errors = {}
  if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.'
  return { values, errors }
}
