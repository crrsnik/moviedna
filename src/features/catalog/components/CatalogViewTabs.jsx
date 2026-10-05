import { useTranslation } from '../../localization/hooks/useTranslation.js'

export default function CatalogViewTabs({
  views,
  selected,
  onChange,
}) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('catalog.views.navigation')}
      className="flex flex-wrap gap-2"
    >
      {Object.entries(views).map(
        ([view, label]) => (
          <button
            key={view}
            type="button"
            aria-current={
              selected === view
                ? 'true'
                : undefined
            }
            onClick={() => onChange(view)}
            className={`rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              selected === view
                ? 'border-accent bg-accent-soft text-accent'
                : 'text-secondary'
            }`}
          >
            {label}
          </button>
        )
      )}
    </nav>
  )
}
