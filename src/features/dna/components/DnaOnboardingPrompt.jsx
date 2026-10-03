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
    <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950/60 p-4">
      <h2 className="text-lg font-semibold text-zinc-100">
        {t('profile.dnaTestTitle')}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        {t('profile.dnaTestDescription')}
      </p>

      <Link
        to="/onboarding"
        className="mt-4 inline-flex rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
      >
        {t('profile.dnaTestAction')}
      </Link>
    </div>
  )
}
