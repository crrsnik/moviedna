import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../../shared/config/firebase.js'
import { PasswordResetError } from './passwordResetErrors.js'

export async function requestPasswordReset(email) {
  try {
    // No ActionCodeSettings: use Firebase's standard hosted action handler.
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    // Do not reveal whether an account exists, even when enumeration protection
    // is disabled in Firebase and the SDK reports this error explicitly.
    if (error?.code !== 'auth/user-not-found') {
      throw new PasswordResetError(error?.code)
    }
  }
  return { success: true }
}
