import { isValidEmail, normalizeEmail } from './emailValidation.js'

export function validateLogin({ email, password }) {
  const values = {
    email: normalizeEmail(email),
    // Passwords are never trimmed or otherwise normalized.
    password: typeof password === 'string' ? password : '',
  }
  const errors = {}

  if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.'
  if (!values.password.length) errors.password = 'Enter your password.'

  return { values, errors }
}
