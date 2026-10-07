import { Link } from 'react-router-dom'

import DetailImage from '../../catalog/components/DetailImage.jsx'
import { getTmdbPosterUrl } from '../../catalog/services/tmdbImages.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { savedMediaRoute } from '../validation/libraryValidation.js'
import { useLibraryAction } from '../hooks/useLibraryAction.js'
import { useLocalizedSavedMedia } from '../hooks/useLocalizedSavedMedia.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'

export default function SavedMediaCard({
  item,
  uid,
  view,
  listId,
}) {
  const { t, locale } = useTranslation()
  const action = useLibraryAction()

  const displayItem =
    useLocalizedSavedMedia(
      item,
      locale,
    )

  const removeLabel = listId
    ? t('library.items.removeFromList')
    : view === 'favorites'
      ? t('library.items.removeFromFavorites')
      : t('library.items.removeFromWatchlist')

  return (
    <article className="min-w-0 space-y-3">
      <Link
        to={savedMediaRoute(item)}
        className="block space-y-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <DetailImage
          src={getTmdbPosterUrl(
            displayItem.posterPath,
          )}
          alt={t(
            'catalog.media.posterAlt',
            { title: displayItem.title },
          )}
          placeholder={t(
            'catalog.media.noPoster',
          )}
          className="aspect-2/3 rounded-lg"
        />

        <h2
          className="
            line-clamp-2 min-h-12
            break-words font-medium leading-6
          "
          title={displayItem.title}
        >
          {displayItem.title}
        </h2>

        <p className="truncate text-sm text-secondary">
          {[
            item.mediaType === 'movie'
              ? t('catalog.media.movie')
              : t('catalog.media.tv'),
            displayItem.releaseYear,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </Link>

      <button
        type="button"
        disabled={action.pending}
        onClick={() => (
          action.run(() => (
            listId
              ? mediaLibraryService
                .removeMediaFromCustomList(
                  uid,
                  item.key,
                  listId,
                )
              : mediaLibraryService
                .removeFromView({
                  uid,
                  view,
                  media: item,
                })
          ))
        )}
        className="rounded border border-border px-3 py-2 text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50"
      >
        {action.pending
          ? t('library.items.saving')
          : removeLabel}
      </button>

      {action.error && (
        <p
          role="alert"
          className="text-sm text-red-300"
        >
          {t('library.errors.action')}
        </p>
      )}
    </article>
  )
}
