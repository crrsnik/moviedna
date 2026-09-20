import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../../../shared/config/firebase.js'

export function subscribeToAuthState(onUserChanged, onError) {
  return onAuthStateChanged(auth, onUserChanged, onError)
}

export function logoutUser() {
  return signOut(auth)
}
