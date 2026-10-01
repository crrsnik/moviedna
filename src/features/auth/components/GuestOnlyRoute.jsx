import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

function GuestOnlyRoute() {
  const { isAuthenticated, registrationStatus } = useAuth()
  // Auth signs in before the profile transaction completes. Keep its form mounted,
  // including a rollback failure message if the new session could not be cleared.
  if (isAuthenticated && registrationStatus === 'idle') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

export default GuestOnlyRoute
