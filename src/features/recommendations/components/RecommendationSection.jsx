import RecommendationCard from './RecommendationCard.jsx'
import { useRecommendations } from '../hooks/useRecommendations.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

export const RECOMMENDATION_DISPLAY_LIMIT = 20

function RecommendationState({
  kind,
  retry,
  t,
}) {
  if (kind === 'loading') {
    return (
      <p
        role="status"
        aria-live="polite"
        className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-sm text-zinc-400 motion-reduce:animate-none"
      >
        {t('catalog.recommendations.loading')}
      </p>
    )
  }

  if (kind === 'unavailable') {
    return (
      <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
        {t('catalog.recommendations.unavailable')}
      </p>
    )
  }

  if (kind === 'error') {
    return (
      <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <p
          role="alert"
          className="text-sm text-zinc-300"
        >
          {t('catalog.recommendations.error')}
        </p>

        <button
          type="button"
          onClick={retry}
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (kind === 'empty') {
    return (
      <p className="text-sm text-zinc-400">
        {t('catalog.recommendations.empty')}
      </p>
    )
  }

  return null
}

function RecommendationSection() {
  const { t } = useTranslation()
  const state = useRecommendations()
  const titleId = 'recommended-for-you'

  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 space-y-5"
    >
      <div className="space-y-1">
        <h2
          id={titleId}
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          {t('catalog.recommendations.title')}
        </h2>

        <p className="text-sm text-zinc-400">
          {t('catalog.recommendations.subtitle')}
        </p>
      </div>

      {state.kind === 'ready' ? (
        <div
          role="region"
          aria-labelledby={titleId}
          tabIndex={0}
          className="min-w-0 overflow-x-auto rounded-lg pb-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
        >
          <ul className="flex gap-5">
            {state.results
              .slice(
                0,
                RECOMMENDATION_DISPLAY_LIMIT,
              )
              .map((recommendation) => (
              <li
                key={recommendation.mediaKey}
                className="shrink-0"
              >
                <RecommendationCard
                  recommendation={recommendation}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <RecommendationState
          kind={state.kind}
          retry={state.retry}
          t={t}
        />
      )}
    </section>
  )
}

export default RecommendationSection
