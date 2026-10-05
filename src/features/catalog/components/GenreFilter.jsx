import { useTranslation } from '../../localization/hooks/useTranslation.js'

export default function GenreFilter({
  state,
  selected,
  onChange,
}) {
  const { t } = useTranslation()

  const genres = [
    {
      id: null,
      name: t('catalog.genres.all'),
    },
    ...(state.data ?? []),
  ]

  return (
    <section
      aria-label={t('catalog.genres.navigation')}
      className="min-w-0 space-y-3"
    >
      {state.loading && (
        <p
          role="status"
          className="text-sm text-secondary"
        >
          {t('catalog.genres.loading')}
        </p>
      )}

      {state.error && (
        <div className="space-y-2">
          <p
            role="alert"
            className="text-sm text-amber-200"
          >
            {t('catalog.errors.unavailable')}
          </p>

          <button
            type="button"
            onClick={state.retry}
            className="rounded px-2 py-1 underline focus-visible:outline-2"
          >
            {t('catalog.genres.retry')}
          </button>
        </div>
      )}

      <div
        className="flex max-w-full gap-2 overflow-x-auto px-1 py-2"
        aria-label={t('catalog.genres.filters')}
      >
        {genres.map(genre => (
          <button
            key={genre.id ?? 'all'}
            type="button"
            aria-pressed={selected === genre.id}
            onClick={() => onChange(genre.id)}
            className={`shrink-0 rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              selected === genre.id
                ? 'bg-accent text-accent-contrast hover:bg-accent-hover'
                : 'text-secondary'
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>
    </section>
  )
}
