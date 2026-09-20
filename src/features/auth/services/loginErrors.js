const messages = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'Unable to sign in. Please contact support.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Check your connection and try again.',
  'auth/operation-not-allowed': 'Sign-in is currently unavailable. Please try later.',
  'login/unknown': "We couldn't sign you in. Please try again later.",
}

export class LoginError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(messages, code) ? code : 'login/unknown'
    super(messages[safeCode])
    this.name = 'LoginError'
    this.code = safeCode
  }
}

export function getLoginErrorMessage(error) {
  return Object.hasOwn(messages, error?.code) ? messages[error.code] : messages['login/unknown']
}
