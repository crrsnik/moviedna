export class AccountDeletionError extends Error {
  constructor(code) {
    super(code)
    this.name = 'AccountDeletionError'
    this.code = code
  }
}

export function toAccountDeletionError(error) {
  if (error instanceof AccountDeletionError) {
    return error
  }

  const code = error?.code

  if (
    code === 'auth/invalid-credential'
    || code === 'auth/wrong-password'
  ) {
    return new AccountDeletionError(
      'wrong-password',
    )
  }

  if (code === 'auth/too-many-requests') {
    return new AccountDeletionError(
      'too-many-requests',
    )
  }

  if (
    code === 'auth/network-request-failed'
    || code === 'functions/unavailable'
    || code === 'functions/deadline-exceeded'
  ) {
    return new AccountDeletionError(
      'unavailable',
    )
  }

  if (
    code === 'functions/failed-precondition'
  ) {
    return new AccountDeletionError(
      'recent-login-required',
    )
  }

  if (
    code === 'functions/unauthenticated'
    || code === 'auth/user-token-expired'
  ) {
    return new AccountDeletionError(
      'unauthenticated',
    )
  }

  return new AccountDeletionError(
    'unknown',
  )
}
