import { createContext, useEffect, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { subscribeToUserProfile } from '../services/userProfileService.js'
import { getProfileContextValue } from './profileState.js'

// oxlint-disable-next-line react/only-export-components
export const UserProfileContext = createContext(undefined)

export function UserProfileProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [state, setState] = useState({ uid, profile: null, isProfileLoading: Boolean(uid), profileError: null })
  // Reset before children render; do not remount a pending registration form.
  if (state.uid !== uid) {
    setState({ uid, profile: null, isProfileLoading: Boolean(uid), profileError: null })
  }

  useEffect(() => {
    if (!uid) return
    let active = true
    const unsubscribe = subscribeToUserProfile(uid, (result) => {
      if (active) setState({ uid, ...result, isProfileLoading: false })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [uid])

  return <UserProfileContext.Provider value={getProfileContextValue(uid, state)}>{children}</UserProfileContext.Provider>
}
