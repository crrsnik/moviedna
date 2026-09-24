import { Navigate, Outlet } from 'react-router-dom'
import { useUserProfile } from '../hooks/useUserProfile.js'
import { getProfileErrorMessage } from '../services/profileErrors.js'

function OnboardingRoute({ requireCompleted = false }) {
  const { profile, isProfileLoading, profileError, hasCompletedOnboarding } = useUserProfile()
  if (isProfileLoading) return <p role="status" aria-live="polite" className="text-zinc-400">Loading your profile…</p>
  if (profileError || !profile) {
    return (
      <div className="max-w-md space-y-5 text-center">
        <p role="alert" className="text-zinc-300">{profileError || getProfileErrorMessage('missing')}</p>
        <button type="button" onClick={() => window.location.reload()} className="rounded-md bg-zinc-100 px-4 py-2 font-medium text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100">
          Refresh page
        </button>
      </div>
    )
  }
  if (requireCompleted) return hasCompletedOnboarding ? <Outlet /> : <Navigate to="/onboarding" replace />
  return hasCompletedOnboarding ? <Navigate to="/" replace /> : <Outlet />
}

export default OnboardingRoute
