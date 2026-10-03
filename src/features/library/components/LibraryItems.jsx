import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { useLibrarySubscription } from '../hooks/useLibrarySubscription.js'

import SavedMediaCard from './SavedMediaCard.jsx'
import { libraryButton } from './LibraryDialog.jsx'

export default function LibraryItems({
  uid,
  view,
  listId,
}) {
  const { t } = useTranslation()

  const {
    data,
    loading,
    error,
    retry,
  } = useLibrarySubscription({
    uid,
    view,
    listId,
    kind: listId
      ? 'items'
      : undefined,
  })

  if (loading) {
    return (
      <p
        role="status"
        aria-live="polite"
      >
        {t('library.items.loading')}
      </p>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert">
          {t('library.errors.load')}
        </p>

        <button
          type="button"
          onClick={retry}
          className={libraryButton}
        >
          {t('library.items.retry')}
        </button>
      </div>
    )
  }

  if (!data?.length) {
    const key = listId
      ? 'library.items.emptyList'
      : view === 'favorites'
        ? 'library.items.emptyFavorites'
        : 'library.items.emptyWatchlist'

    return <p>{t(key)}</p>
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
      {data.map(item => (
        <SavedMediaCard
          key={item.key}
          item={item}
          uid={uid}
          view={view}
          listId={listId}
        />
      ))}
    </div>
  )
}
