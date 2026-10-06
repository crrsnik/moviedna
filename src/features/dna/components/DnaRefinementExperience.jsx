import {
  Link,
} from 'react-router-dom'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

import OnboardingActions from '../../onboarding/components/OnboardingActions.jsx'
import SwipeMovieCard from '../../onboarding/components/SwipeMovieCard.jsx'

import {
  MAX_DNA_REFINEMENT_RESPONSES,
} from '../constants/dnaRefinement.js'

import {
  useDnaRefinement,
} from '../hooks/useDnaRefinement.js'


export default function DnaRefinementExperience() {
  const { t } = useTranslation()

  const {
    currentMovie,
    responseCount,
    remainingCount,
    isComplete,
    isLoading,
    isSaving,
    loadError,
    actionError,
    retry,
    reactToMovie,
  } = useDnaRefinement()

  return (
    <section
      className="mx-auto w-full min-w-0 max-w-2xl space-y-6"
      aria-labelledby="dna-refinement-title"
    >
      <header className="space-y-3 text-center">
        <h1
          id="dna-refinement-title"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {t('dnaUi.refinement.title')}
        </h1>

        <p className="text-sm leading-relaxed text-secondary">
          {t('dnaUi.refinement.description')}
        </p>

        <p className="text-sm font-medium text-primary">
          {t(
            'dnaUi.refinement.progress',
            {
              current: responseCount,
              total: MAX_DNA_REFINEMENT_RESPONSES,
            },
          )}
        </p>

        {!isComplete && (
          <p className="text-xs text-tertiary">
            {t(
              'dnaUi.refinement.remaining',
              { count: remainingCount },
            )}
          </p>
        )}
      </header>

      <div className="text-center">
        <Link
          to="/profile/dna"
          className="rounded px-4 py-2 text-sm text-secondary underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          {isComplete
            ? t('dnaUi.refinement.backToDna')
            : t('dnaUi.refinement.continueLater')}
        </Link>
      </div>

      {isLoading ? (
        <p
          role="status"
          className="py-12 text-center text-secondary"
        >
          {t('dnaUi.refinement.loading')}
        </p>
      ) : loadError ? (
        <div className="space-y-3 py-8 text-center">
          <p
            role="alert"
            className="text-sm text-amber-200"
          >
            {t('dnaUi.refinement.loadError')}
          </p>

          <button
            type="button"
            onClick={retry}
            className="rounded px-4 py-2 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus"
          >
            {t('onboarding.retry')}
          </button>
        </div>
      ) : isComplete ? (
        <div className="rounded-2xl border border-border bg-surface-muted p-6 text-center">
          <h2 className="text-xl font-semibold">
            {t('dnaUi.refinement.completeTitle')}
          </h2>

          <p className="mt-2 text-sm text-secondary">
            {t('dnaUi.refinement.completeDescription')}
          </p>
        </div>
      ) : currentMovie ? (
        <>
          <div className="px-3 py-2">
            <SwipeMovieCard
              movie={currentMovie}
              disabled={isSaving}
              onReact={reactToMovie}
            />
          </div>

          <OnboardingActions
            disabled={isSaving}
            onReact={reactToMovie}
          />

          <p
            id="onboarding-controls-help"
            className="text-center text-xs text-tertiary"
          >
            {t('onboarding.controlsHelp')}
          </p>
        </>
      ) : (
        <div className="space-y-3 py-8 text-center">
          <p className="text-secondary">
            {t('dnaUi.refinement.noMoreCards')}
          </p>

          <button
            type="button"
            onClick={retry}
            className="rounded px-4 py-2 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus"
          >
            {t('onboarding.retry')}
          </button>
        </div>
      )}

      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-center text-sm text-secondary"
      >
        {isSaving
          ? t('dnaUi.refinement.saving')
          : ''}
      </p>

      {actionError && (
        <p
          role="alert"
          className="text-center text-sm text-rose-200"
        >
          {t('dnaUi.refinement.actionError')}
        </p>
      )}
    </section>
  )
}
