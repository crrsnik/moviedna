import { useContext } from 'react'
import { UserProfileContext } from '../context/UserProfileContext.jsx'

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (context === undefined) throw new Error('useUserProfile must be used within UserProfileProvider')
  return context
}
