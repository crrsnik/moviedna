import { useNavigate } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { useOnboarding } from '../hooks/useOnboarding.js'
import {
  MAX_RESPONSES,
} from '../validation/onboardingValidation.js'
import OnboardingActions from './OnboardingActions.jsx'
import SwipeMovieCard from './SwipeMovieCard.jsx'

function OnboardingExperience() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const {
    currentMovie,
    progress,
    isLoading,
    isSaving,
    isCompleting,
    loadError,
    actionError,
    retry,
    reactToMovie,
    complete,
  } = useOnboarding()

  const busy = isSaving || isCompleting

  const reachedLimit = (
    progress.responseCount >= MAX_RESPONSES
  )

  const noCards = !currentMovie || reachedLimit

  return (
    <section
      className="w-full min-w-0 max-w-2xl space-y-6"
      aria-labelledby="onboarding-title"
    >
      <div className="space-y-3 text-center">
        <h1
          id="onboarding-title"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {t('onboarding.title')}
        </h1>

        <p className="text-sm leading-relaxed text-zinc-400">
          {t('onboarding.description')}
        </p>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => navigate(
            '/',
            { replace: true },
          )}
          disabled={busy}
          className="rounded px-4 py-2 text-sm text-zinc-400 underline underline-offset-4 hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:opacity-40"
        >
          {t('onboarding.skipForNow')}
        </button>
      </div>

      {isLoading ? (
        <p
          role="status"
          className="py-12 text-center text-zinc-400"
        >
          {t('onboarding.loading')}
        </p>
      ) : (
        <>
          <div className="space-y-2 text-center text-sm text-zinc-300">
            <p>
              {t(
                'onboarding.progressSummary',
                {
                  total:
                    progress.responseCount,
                  opinions:
                    progress.opinionatedCount,
                },
              )}
            </p>

            <p className="text-xs text-zinc-500">
              {t('onboarding.requirements')}
            </p>
          </div>

          {loadError ? (
            <div className="space-y-3 text-center">
              <p
                role="alert"
                className="text-sm text-amber-200"
              >
                {t('onboarding.loadError')}
              </p>

              <button
                type="button"
                onClick={retry}
                disabled={busy}
                className="rounded px-4 py-2 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-zinc-100 disabled:opacity-40"
              >
                {t('onboarding.retry')}
              </button>
            </div>
          ) : noCards ? (
            <div className="space-y-3 py-6 text-center">
              <p>
                {progress.canFinish
                  ? t(
                    'onboarding.readyToFinish',
                  )
                  : t(
                    'onboarding.noMoreMovies',
                  )}
              </p>

              {!progress.canFinish && (
                <button
                  type="button"
                  onClick={retry}
                  disabled={busy}
                  className="rounded px-4 py-2 underline focus-visible:outline-2 focus-visible:outline-zinc-100 disabled:opacity-40"
                >
                  {t('onboarding.retry')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="px-3 py-2">
                <SwipeMovieCard
                  movie={currentMovie}
                  disabled={busy}
                  onReact={reactToMovie}
                />
              </div>

              <OnboardingActions
                disabled={busy}
                onReact={reactToMovie}
              />

              <p
                id="onboarding-controls-help"
                className="text-center text-xs text-zinc-500"
              >
                {t('onboarding.controlsHelp')}
              </p>
            </>
          )}

          <p
            role="status"
            aria-live="polite"
            className="min-h-5 text-center text-sm text-zinc-400"
          >
            {isSaving
              ? t('onboarding.savingReaction')
              : isCompleting
                ? t('onboarding.finishing')
                : ''}
          </p>

          {actionError && (
            <p
              role="alert"
              className="text-center text-sm text-rose-200"
            >
              {t('onboarding.actionError')}
            </p>
          )}

          <div className="space-y-3 border-t border-zinc-800 pt-6 text-center">
            <button
              type="button"
              onClick={complete}
              disabled={
                busy
                || !progress.canFinish
              }
              aria-describedby="finish-requirements"
              className="rounded-lg bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isCompleting
                ? t('onboarding.finishing')
                : t('onboarding.finish')}
            </button>

            <p
              id="finish-requirements"
              className="text-xs text-zinc-400"
            >
              {progress.canFinish ? (
                t('onboarding.progressSaved')
              ) : (
                <>
                  {t(
                    'onboarding.stillNeeded',
                    {
                      responses:
                        progress.missingResponses,
                      opinions:
                        progress.missingOpinions,
                    },
                  )}

                  {progress.responseCount
                    > MAX_RESPONSES && (
                    <>
                      {' '}
                      {t(
                        'onboarding.tooManyResponses',
                      )}
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </>
      )}
    </section>
  )
}

export default OnboardingExperience
