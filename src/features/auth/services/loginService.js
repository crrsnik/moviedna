import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../../shared/config/firebase.js'
import { LoginError } from './loginErrors.js'

export async function loginUser({ email, password }) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  } catch (error) {
    throw new LoginError(error?.code)
  }
}
