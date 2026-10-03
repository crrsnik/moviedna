const MESSAGE_KEYS = Object.freeze({
  'Incorrect email or password.':
    'auth.errors.incorrectCredentials',

  'Enter a valid email address.':
    'auth.validation.invalidEmail',

  'Enter your password.':
    'auth.validation.passwordRequired',

  'Unable to sign in. Please contact support.':
    'auth.errors.userDisabled',

  'Too many attempts. Please try again later.':
    'auth.errors.tooManyRequests',

  'Check your connection and try again.':
    'auth.errors.network',

  'Sign-in is currently unavailable. Please try later.':
    'auth.errors.signInUnavailable',

  "We couldn't sign you in. Please try again later.":
    'auth.errors.loginUnknown',

  'This username is taken. Please choose another.':
    'auth.errors.usernameTaken',

  'This email is already registered. Please log in.':
    'auth.errors.emailInUse',

  'Choose a stronger password and try again.':
    'auth.errors.weakPassword',

  'Registration is currently unavailable. Please try later.':
    'auth.errors.registrationUnavailable',

  "We couldn't create your profile. Please try again later.":
    'auth.errors.profileCreation',

  "We couldn't finish registration or remove the new account. Please contact support before trying again.":
    'auth.errors.rollbackFailed',

  "We couldn't finish registration or sign you out. Please log out and contact support before trying again.":
    'auth.errors.rollbackSignoutFailed',

  'Please log out before creating another account.':
    'auth.errors.alreadyAuthenticated',

  'Registration is already in progress. Please wait.':
    'auth.errors.registrationInProgress',

  'Please check your registration details.':
    'auth.errors.invalidRegistration',

  "We couldn't create your account. Please try again later.":
    'auth.errors.registrationUnknown',

  'Password recovery is currently unavailable. Please try later.':
    'auth.errors.passwordRecoveryUnavailable',

  "We couldn't process your request. Please try again later.":
    'auth.errors.passwordResetUnknown',

  'If an account exists for this email, password reset instructions have been sent.':
    'auth.passwordReset.success',

  'Use 3–20 lowercase letters, numbers, or underscores.':
    'auth.validation.invalidUsername',

  'Enter a display name of 1–50 characters.':
    'auth.validation.invalidDisplayName',

  'Use a password of 8–128 characters.':
    'auth.validation.invalidPassword',

  'Confirm your password.':
    'auth.validation.confirmPassword',

  'Passwords must match.':
    'auth.validation.passwordsMismatch',
})

export function translateAuthMessage(t, message) {
  if (typeof message !== 'string' || !message) {
    return message
  }

  const key = MESSAGE_KEYS[message]

  return key
    ? t(key)
    : message
}
