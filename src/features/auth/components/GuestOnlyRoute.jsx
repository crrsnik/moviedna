import {
  Navigate,
  Outlet,
} from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'

function GuestOnlyRoute() {
  const {
    isAuthenticated,
    registrationStatus,
  } = useAuth()

  // Keep the registration form mounted while account creation is pending.
  // Once registration succeeds, onboarding owns the first authenticated route.
  if (
    isAuthenticated
    && registrationStatus === 'succeeded'
  ) {
    return <Navigate to="/onboarding" replace />
  }

  if (
    isAuthenticated
    && registrationStatus === 'idle'
  ) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default GuestOnlyRoute
