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
        className="animate-pulse rounded-xl border border-border bg-surface p-8 text-sm text-secondary shadow-[var(--app-shadow-sm)] motion-reduce:animate-none"
      >
        {t('catalog.recommendations.loading')}
      </p>
    )
  }

  if (kind === 'unavailable') {
    return (
      <p className="rounded-xl border border-border bg-surface p-6 text-sm text-secondary shadow-[var(--app-shadow-sm)]">
        {t('catalog.recommendations.unavailable')}
      </p>
    )
  }

  if (kind === 'error') {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-[var(--app-shadow-sm)]">
        <p
          role="alert"
          className="text-sm text-secondary"
        >
          {t('catalog.recommendations.error')}
        </p>

        <button
          type="button"
          onClick={retry}
          className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (kind === 'empty') {
    return (
      <p className="text-sm text-secondary">
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
          className="text-xl font-semibold tracking-tight text-primary sm:text-2xl"
        >
          {t('catalog.recommendations.title')}
        </h2>

        <p className="text-sm text-secondary">
          {t('catalog.recommendations.subtitle')}
        </p>
      </div>

      {state.kind === 'ready' ? (
        <div
          role="region"
          aria-labelledby={titleId}
          tabIndex={0}
          className="min-w-0 overflow-x-auto rounded-lg pb-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
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
                  onHide={state.hideRecommendation}
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
