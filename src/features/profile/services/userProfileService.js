import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../shared/config/firebase.js'
import { normalizeUserProfile } from './normalizeUserProfile.js'
import { getProfileErrorMessage } from './profileErrors.js'

export function subscribeToUserProfile(uid, onChange) {
  const onError = (error) => onChange({ profile: null, profileError: getProfileErrorMessage(error?.code) })
  try {
    // Accept one document ID, never a path or a collection query.
    if (typeof uid !== 'string' || !uid || uid.includes('/')) throw new Error('Invalid user ID')
    return onSnapshot(doc(db, 'users', uid), (snapshot) => {
      let result
      try {
        result = normalizeUserProfile(snapshot)
      } catch {
        result = { profile: null, profileError: getProfileErrorMessage('invalid') }
      }
      onChange(result)
    }, onError)
  } catch (error) {
    onError(error)
    return () => {}
  }
}
