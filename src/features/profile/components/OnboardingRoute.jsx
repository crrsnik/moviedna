import {
  Navigate,
  Outlet,
} from 'react-router-dom'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'
import {
  hasOnboardingResultPending,
} from '../../onboarding/constants/onboardingResult.js'
import {
  useUserProfile,
} from '../hooks/useUserProfile.js'

function OnboardingRoute({
  requireCompleted = false,
}) {
  const { t } = useTranslation()

  const {
    profile,
    isProfileLoading,
    profileError,
    hasCompletedOnboarding,
  } = useUserProfile()

  if (isProfileLoading) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="text-secondary"
      >
        {t('onboarding.route.loading')}
      </p>
    )
  }

  if (profileError || !profile) {
    return (
      <div
        className="
          mx-auto max-w-md
          space-y-5 text-center
        "
      >
        <p
          role="alert"
          className="text-secondary"
        >
          {t('onboarding.route.error')}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="
            rounded-md bg-accent
            px-4 py-2 font-medium
            text-accent-contrast
            hover:bg-accent-hover
            focus-visible:outline-2
            focus-visible:outline-offset-4
            focus-visible:outline-focus
          "
        >
          {t('onboarding.route.refresh')}
        </button>
      </div>
    )
  }

  if (requireCompleted) {
    return hasCompletedOnboarding
      ? <Outlet />
      : <Navigate to="/onboarding" replace />
  }

  if (!hasCompletedOnboarding) {
    return <Outlet />
  }

  return (
    <Navigate
      to={
        hasOnboardingResultPending()
          ? '/onboarding/result'
          : '/'
      }
      replace
    />
  )
}

export default OnboardingRoute
