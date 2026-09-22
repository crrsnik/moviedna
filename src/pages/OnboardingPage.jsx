import OnboardingExperience from '../features/onboarding/components/OnboardingExperience.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'

function OnboardingPage() {
  const { user } = useAuth()
  // Never reuse a previous account's deck, progress or pending action state.
  return <OnboardingExperience key={user?.uid} />
}

export default OnboardingPage
