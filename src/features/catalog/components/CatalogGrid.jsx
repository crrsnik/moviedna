import { useTranslation } from '../../localization/hooks/useTranslation.js'

import MediaCard from './MediaCard.jsx'
import PersonCard from './PersonCard.jsx'

export default function CatalogGrid({ state }) {
  const { t } = useTranslation()

  if (state.loading) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="py-12 text-secondary"
      >
        {t('catalog.states.loadingCatalog')}
      </p>
    )
  }

  if (state.error) {
    return (
      <div className="space-y-4 py-8">
        <p role="alert">
          {t('catalog.errors.unavailable')}
        </p>

        <button
          type="button"
          onClick={state.retry}
          className="rounded-lg border border-border px-4 py-2 hover:bg-surface-muted focus-visible:outline-2"
        >
          {t('catalog.states.retryCatalog')}
        </button>
      </div>
    )
  }

  if (!state.data?.results.length) {
    return (
      <p
        role="status"
        className="py-12 text-secondary"
      >
        {t('catalog.states.noCatalogResults')}
      </p>
    )
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {state.data.results.map(item => (
        item.mediaType === 'person'
          ? (
            <PersonCard
              key={`person:${item.id}`}
              person={item}
            />
          )
          : (
            <MediaCard
              key={`${item.mediaType}:${item.id}`}
              media={item}
              fluid
              showType
            />
          )
      ))}
    </div>
  )
}
