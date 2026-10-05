import DnaOnboardingPrompt from './DnaOnboardingPrompt.jsx'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

const messageKeys = {
  loading: [
    'dnaUi.states.loadingTitle',
    'dnaUi.states.loadingDetail',
  ],
  empty: [
    'dnaUi.states.emptyTitle',
    'dnaUi.states.emptyDetail',
  ],
  running: [
    'dnaUi.states.runningTitle',
    'dnaUi.states.runningDetail',
  ],
  insufficient: [
    'dnaUi.states.insufficientTitle',
    'dnaUi.states.insufficientDetail',
  ],
  malformed: [
    'dnaUi.states.malformedTitle',
    'dnaUi.states.malformedDetail',
  ],
  error: [
    'dnaUi.states.errorTitle',
    'dnaUi.states.errorDetail',
  ],
}

export default function DnaStatePanel({
  kind,
}) {
  const { t } = useTranslation()

  const [titleKey, detailKey] = (
    messageKeys[kind]
    ?? messageKeys.error
  )

  return (
    <section
      aria-labelledby="dna-state-title"
      className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 text-center"
    >
      <h1
        id="dna-state-title"
        className="text-2xl font-semibold"
      >
        {t(titleKey)}
      </h1>

      <p
        role="status"
        aria-live="polite"
        className="mt-3 text-secondary"
      >
        {t(detailKey)}
      </p>
        <DnaOnboardingPrompt />
</section>
  )
}
