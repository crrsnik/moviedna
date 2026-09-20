import { createUserWithEmailAndPassword, updateProfile, deleteUser, signOut } from 'firebase/auth'
import { runTransaction, doc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../../shared/config/firebase.js'
import { normalizeUsername, validateRegistration } from '../validation/registrationValidation.js'
import { RegistrationError } from './registrationErrors.js'

let registrationPending = false

export async function registerUser({ username, displayName, email, password }) {
  if (registrationPending) throw new RegistrationError('registration/in-progress')
  if (auth.currentUser) throw new RegistrationError('registration/already-authenticated')
  if (Object.keys(validateRegistration({ username, displayName, email, password, confirmPassword: password })).length) {
    throw new RegistrationError('registration/invalid-input')
  }

  const normalizedUsername = normalizeUsername(username)
  const trimmedDisplayName = displayName.trim()
  const trimmedEmail = email.trim()
  let createdUser
  registrationPending = true

  try {
    const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password)
    createdUser = credential.user
    await updateProfile(createdUser, { displayName: trimmedDisplayName })

    const profileRef = doc(db, 'users', createdUser.uid)
    const usernameRef = doc(db, 'usernames', normalizedUsername)
    await runTransaction(db, async (transaction) => {
      const existingUsername = await transaction.get(usernameRef)
      if (existingUsername.exists()) throw new RegistrationError('username-already-taken')

      transaction.set(profileRef, {
        username: normalizedUsername,
        displayName: trimmedDisplayName,
        photoURL: null,
        bio: '',
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      transaction.set(usernameRef, {
        userId: createdUser.uid,
        createdAt: serverTimestamp(),
      })
    })

    // No fallible operations after a successful transaction.
    return createdUser
  } catch (error) {
    if (createdUser) {
      try {
        await deleteUser(createdUser)
      } catch {
        try {
          await signOut(auth)
        } catch {
          throw new RegistrationError('registration/rollback-signout-failed')
        }
        throw new RegistrationError('registration/rollback-failed')
      }
    }
    throw new RegistrationError(error?.code)
  } finally {
    registrationPending = false
  }
}
