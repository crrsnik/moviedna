const messages = {
  'username-already-taken': 'This username is taken. Please choose another.',
  'auth/email-already-in-use': 'This email is already registered. Please log in.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Choose a stronger password and try again.',
  'auth/network-request-failed': 'Check your connection and try again.',
  'auth/operation-not-allowed': 'Registration is currently unavailable. Please try later.',
  'permission-denied': "We couldn't create your profile. Please try again later.",
  'registration/rollback-failed': "We couldn't finish registration or remove the new account. Please contact support before trying again.",
  'registration/rollback-signout-failed': "We couldn't finish registration or sign you out. Please log out and contact support before trying again.",
  'registration/already-authenticated': 'Please log out before creating another account.',
  'registration/in-progress': 'Registration is already in progress. Please wait.',
  'registration/invalid-input': 'Please check your registration details.',
  'registration/unknown': "We couldn't create your account. Please try again later.",
}

export class RegistrationError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(messages, code) ? code : 'registration/unknown'
    super(messages[safeCode])
    this.name = 'RegistrationError'
    this.code = safeCode
  }
}

export function getRegistrationErrorMessage(error) {
  return Object.hasOwn(messages, error?.code) ? messages[error.code] : messages['registration/unknown']
}
