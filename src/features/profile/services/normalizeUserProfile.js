import { Timestamp } from 'firebase/firestore'
import { getProfileErrorMessage } from './profileErrors.js'

export function normalizeUserProfile(snapshot) {
  if (!snapshot.exists()) return { profile: null, profileError: getProfileErrorMessage('missing') }
  const data = snapshot.data()
  if (!data || typeof snapshot.id !== 'string' || !snapshot.id
    || typeof data.username !== 'string' || typeof data.displayName !== 'string'
    || typeof data.bio !== 'string' || typeof data.onboardingCompleted !== 'boolean'
    || !(data.photoURL === null || typeof data.photoURL === 'string')
    || !(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp)) {
    return { profile: null, profileError: getProfileErrorMessage('invalid') }
  }
  const { username, displayName, photoURL, bio, onboardingCompleted, createdAt, updatedAt } = data
  return {
    profile: { id: snapshot.id, username, displayName, photoURL, bio, onboardingCompleted, createdAt, updatedAt },
    profileError: null,
  }
}
