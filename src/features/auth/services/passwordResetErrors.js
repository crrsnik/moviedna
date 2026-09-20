export const PASSWORD_RESET_SUCCESS_MESSAGE = 'If an account exists for this email, password reset instructions have been sent.'

const messages = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Check your connection and try again.',
  'auth/operation-not-allowed': 'Password recovery is currently unavailable. Please try later.',
  'password-reset/unknown': "We couldn't process your request. Please try again later.",
}

export class PasswordResetError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(messages, code) ? code : 'password-reset/unknown'
    super(messages[safeCode])
    this.name = 'PasswordResetError'
    this.code = safeCode
  }
}

export function getPasswordResetErrorMessage(error) {
  return Object.hasOwn(messages, error?.code) ? messages[error.code] : messages['password-reset/unknown']
}
