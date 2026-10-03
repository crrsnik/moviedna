import { HttpsError } from 'firebase-functions/v2/https'

const MAX_AUTH_AGE_SECONDS = 10 * 60

function safeInternalError() {
  return new HttpsError(
    'internal',
    'The account could not be deleted.',
  )
}

export function createDeleteAccountHandler({
  deleteUserData,
  deleteAuthUser,
  now = () => Date.now(),
}) {
  return async function deleteAccount(request) {
    const uid = request?.auth?.uid

    if (!uid) {
      throw new HttpsError(
        'unauthenticated',
        'Authentication is required.',
      )
    }

    const data = request?.data

    if (
      !data
      || typeof data !== 'object'
      || Array.isArray(data)
      || Object.keys(data).length !== 1
      || data.confirm !== true
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Account deletion must be confirmed.',
      )
    }

    const authTime = Number(
      request.auth?.token?.auth_time,
    )

    const nowSeconds = Math.floor(now() / 1000)
    const age = nowSeconds - authTime

    if (
      !Number.isFinite(authTime)
      || age < -60
      || age > MAX_AUTH_AGE_SECONDS
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Recent authentication is required.',
      )
    }

    try {
      await deleteUserData(uid)
    } catch {
      throw safeInternalError()
    }

    try {
      await deleteAuthUser(uid)
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') {
        throw safeInternalError()
      }
    }

    return {
      deleted: true,
    }
  }
}
