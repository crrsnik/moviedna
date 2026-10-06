import { useEffect } from 'react'
import {
  Link,
  Navigate,
} from 'react-router-dom'

import {
  useMovieDna,
} from '../features/dna/hooks/useMovieDna.js'
import {
  selectDnaPreviewTraits,
} from '../features/dna/utils/selectDnaPreviewTraits.js'
import {
  useTranslation,
} from '../features/localization/hooks/useTranslation.js'
import {
  clearOnboardingResultPending,
} from '../features/onboarding/constants/onboardingResult.js'
import {
  useUserProfile,
} from '../features/profile/hooks/useUserProfile.js'

const CATEGORY_KEYS = Object.freeze({
  genres:
    'profile.overviewPage.categories.genres',
  mediaTypes:
    'profile.overviewPage.categories.mediaTypes',
  decades:
    'profile.overviewPage.categories.decades',
  countries:
    'profile.overviewPage.categories.countries',
  directors:
    'profile.overviewPage.categories.directors',
  actors:
    'profile.overviewPage.categories.actors',
})

function ResultActions() {
  const { t } = useTranslation()

  return (
    <div
      className="
        flex flex-col gap-3
        border-t border-border pt-6
        sm:flex-row sm:flex-wrap
        sm:items-center sm:justify-center
      "
    >
      <Link
        to="/"
        className="
          inline-flex min-h-11
          items-center justify-center
          rounded-lg bg-accent
          px-5 py-2.5
          text-sm font-semibold
          text-accent-contrast
          hover:bg-accent-hover
          focus-visible:outline-2
          focus-visible:outline-offset-4
          focus-visible:outline-focus
        "
      >
        {t('onboardingResult.recommendations')}
      </Link>

      <Link
        to="/profile/dna/refine"
        className="
          inline-flex min-h-11
          items-center justify-center
          rounded-lg border
          border-border-strong
          bg-surface px-5 py-2.5
          text-sm font-semibold text-primary
          hover:bg-surface-muted
          focus-visible:outline-2
          focus-visible:outline-offset-4
          focus-visible:outline-focus
        "
      >
        {t('onboardingResult.improve')}
      </Link>

      <Link
        to="/profile/dna"
        className="
          rounded-md px-3 py-2
          text-center text-sm
          font-medium text-secondary
          underline underline-offset-4
          hover:text-primary
          focus-visible:outline-2
          focus-visible:outline-offset-4
          focus-visible:outline-focus
        "
      >
        {t('onboardingResult.viewDna')}
      </Link>
    </div>
  )
}

export default function OnboardingResultPage() {
  const { t } = useTranslation()

  const {
    hasCompletedOnboarding,
  } = useUserProfile()

  const dnaState = useMovieDna()

  useEffect(() => {
    clearOnboardingResultPending()
  }, [])

  if (!hasCompletedOnboarding) {
    return (
      <Navigate
        to="/onboarding"
        replace
      />
    )
  }

  if (!dnaState.current) {
    const failed = dnaState.kind === 'failed'

    return (
      <section
        aria-labelledby="onboarding-result-title"
        className="
          mx-auto w-full max-w-3xl
          space-y-7 text-center
        "
      >
        <div
          aria-hidden="true"
          className="
            mx-auto flex size-16
            items-center justify-center
            rounded-full border border-border
            bg-surface-muted text-3xl
          "
        >
          🧬
        </div>

        <div className="space-y-3">
          <h1
            id="onboarding-result-title"
            className="
              text-3xl font-semibold
              tracking-tight sm:text-4xl
            "
          >
            {t(
              failed
                ? 'onboardingResult.failedTitle'
                : 'onboardingResult.buildingTitle',
            )}
          </h1>

          <p
            role={failed ? 'alert' : 'status'}
            aria-live="polite"
            className="
              mx-auto max-w-xl
              text-sm leading-relaxed
              text-secondary
            "
          >
            {t(
              failed
                ? 'onboardingResult.failedDescription'
                : 'onboardingResult.buildingDescription',
            )}
          </p>
        </div>

        {failed && (
          <Link
            to="/"
            className="
              inline-flex rounded-lg
              border border-border-strong
              bg-surface px-5 py-2.5
              text-sm font-semibold
              text-primary
              hover:bg-surface-muted
              focus-visible:outline-2
              focus-visible:outline-offset-4
              focus-visible:outline-focus
            "
          >
            {t('onboardingResult.continueHome')}
          </Link>
        )}
      </section>
    )
  }

  const traits = selectDnaPreviewTraits(
    dnaState.current.dimensions,
  )

  return (
    <section
      aria-labelledby="onboarding-result-title"
      className="
        mx-auto w-full max-w-3xl
        space-y-7
      "
    >
      <header className="space-y-3 text-center">
        <div
          aria-hidden="true"
          className="
            mx-auto flex size-16
            items-center justify-center
            rounded-full border border-border
            bg-surface-muted text-3xl
          "
        >
          🧬
        </div>

        <h1
          id="onboarding-result-title"
          className="
            text-3xl font-semibold
            tracking-tight sm:text-4xl
          "
        >
          {t('onboardingResult.title')}
        </h1>

        <p
          className="
            mx-auto max-w-xl
            text-sm leading-relaxed
            text-secondary
          "
        >
          {t(
            traits.length
              ? 'onboardingResult.description'
              : 'onboardingResult.emptyDescription',
          )}
        </p>
      </header>

      {!!traits.length && (
        <div className="grid gap-3 sm:grid-cols-2">
          {traits.map((trait) => {
            const percent = Math.round(
              trait.score * 100,
            )

            return (
              <article
                key={`${trait.dimension}:${trait.key}`}
                className="
                  rounded-2xl border
                  border-border bg-surface
                  p-5
                  shadow-[var(--app-shadow-sm)]
                "
              >
                <p
                  className="
                    text-xs font-medium
                    uppercase tracking-wide
                    text-tertiary
                  "
                >
                  {t(
                    CATEGORY_KEYS[
                      trait.dimension
                    ],
                  )}
                </p>

                <div
                  className="
                    mt-2 flex items-baseline
                    justify-between gap-4
                  "
                >
                  <h2
                    className="
                      min-w-0 break-words
                      text-lg font-semibold
                    "
                  >
                    {trait.label}
                  </h2>

                  <span
                    className="
                      shrink-0 text-sm
                      font-semibold text-secondary
                    "
                  >
                    +{percent}%
                  </span>
                </div>

                <progress
                  value={percent}
                  max="100"
                  aria-label={t(
                    'onboardingResult.signalStrength',
                    {
                      label: trait.label,
                    },
                  )}
                  className="
                    mt-4 h-2 w-full
                    accent-violet-400
                  "
                />
              </article>
            )
          })}
        </div>
      )}

      <ResultActions />
    </section>
  )
}
