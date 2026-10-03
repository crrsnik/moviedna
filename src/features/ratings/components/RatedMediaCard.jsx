import { Link } from 'react-router-dom'

import DetailImage from '../../catalog/components/DetailImage.jsx'
import { getTmdbPosterUrl } from '../../catalog/services/tmdbImages.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { savedMediaRoute } from '../../library/validation/libraryValidation.js'
import { libraryButton } from '../../library/components/LibraryDialog.jsx'

import { useRatingAction } from '../hooks/useRatingAction.js'
import { ratingService } from '../services/ratingService.js'

export default function RatedMediaCard({
  uid,
  item,
}) {
  const { t } = useTranslation()
  const action = useRatingAction()

  return (
    <article className="min-w-0 space-y-3">
      <Link
        to={savedMediaRoute(item)}
        className="block space-y-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <DetailImage
          src={getTmdbPosterUrl(
            item.posterPath,
          )}
          alt={t(
            'catalog.media.posterAlt',
            { title: item.title },
          )}
          placeholder={t(
            'catalog.media.noPoster',
          )}
          className="aspect-2/3 rounded-lg"
        />

        <h3 className="break-words font-medium">
          {item.title}
        </h3>

        <p className="text-sm text-zinc-400">
          {[
            item.mediaType === 'movie'
              ? t('catalog.media.movie')
              : t('catalog.media.tv'),
            item.releaseYear,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </Link>

      <p>
        {t(
          'ratings.current',
          { score: item.score },
        )}
      </p>

      <button
        type="button"
        className={libraryButton}
        disabled={action.pending}
        onClick={() => (
          action.run(
            'remove',
            () => (
              ratingService.deleteRating(
                uid,
                item.key,
              )
            ),
          )
        )}
      >
        {action.pending
          ? t('ratings.removing')
          : t('ratings.remove')}
      </button>

      {action.error && (
        <p role="alert">
          {t('ratings.error')}
        </p>
      )}
    </article>
  )
}
