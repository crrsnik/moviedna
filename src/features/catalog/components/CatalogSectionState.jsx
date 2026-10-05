import { useTranslation } from '../../localization/hooks/useTranslation.js'

function CatalogSectionState({
  isLoading,
  error,
  onRetry,
}) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="animate-pulse rounded-xl border border-border bg-surface p-8 text-sm text-secondary shadow-[var(--app-shadow-sm)] motion-reduce:animate-none"
      >
        {t('catalog.states.loadingTitles')}
      </p>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-[var(--app-shadow-sm)]">
        <p
          role="alert"
          className="text-sm text-secondary"
        >
          {t('catalog.errors.unavailable')}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <p className="text-sm text-secondary">
      {t('catalog.states.noTrending')}
    </p>
  )
}

export default CatalogSectionState
