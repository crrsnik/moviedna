import { Link } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { useUserProfile } from '../../profile/hooks/useUserProfile.js'

export default function DnaOnboardingPrompt() {
  const {
    hasCompletedOnboarding,
  } = useUserProfile()

  const { t } = useTranslation()

  if (hasCompletedOnboarding) {
    return null
  }

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface-muted/60 p-4">
      <h2 className="text-lg font-semibold text-primary">
        {t('profile.dnaTestTitle')}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-secondary">
        {t('profile.dnaTestDescription')}
      </p>

      <Link
        to="/onboarding"
        className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
      >
        {t('profile.dnaTestAction')}
      </Link>
    </div>
  )
}
