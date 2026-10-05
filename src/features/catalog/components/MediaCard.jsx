import { Link } from 'react-router-dom'
import { isValidDetailId } from '../validation/detailRouteValidation.js'
import { useState } from 'react'
import { getTmdbPosterUrl } from '../services/tmdbImages.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

function MediaCard({ media, fluid = false, showType = false }) {
  const { t } = useTranslation()
  const posterUrl = getTmdbPosterUrl(media.posterPath)
  const [failedUrl, setFailedUrl] = useState(null)
  const showPoster = posterUrl && failedUrl !== posterUrl
  const year = media.releaseDate?.slice(0, 4)
  const showRating = media.voteAverage !== null && media.voteCount > 0

  const linked = ['movie', 'tv'].includes(media.mediaType) && isValidDetailId(media.id)
  const Content = linked ? Link : 'div'
  return (
    <article className={`min-w-0 space-y-3 ${fluid ? 'w-full' : 'w-36 sm:w-44'}`}>
      <Content {...(linked ? { to: `/${media.mediaType === 'movie' ? 'movies' : 'tv'}/${media.id}` } : {})} className="group block space-y-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
      <div className="flex aspect-2/3 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted shadow-[var(--app-shadow-sm)] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-border-strong group-hover:shadow-[var(--app-shadow-md)] motion-reduce:transition-none">
        {showPoster ? (
          <img src={posterUrl} alt={t('catalog.media.posterAlt', { title: media.title })} width="342" height="513" loading="lazy" onError={() => setFailedUrl(posterUrl)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none" />
        ) : (
          <span className="px-4 text-center text-sm text-tertiary">{t('catalog.media.noPoster')}</span>
        )}
      </div>
      {showType && <span className="text-xs text-secondary">{media.mediaType === 'movie'
        ? t('catalog.media.movie')
        : t('catalog.media.tv')}</span>}
      <h3 className="line-clamp-2 break-words text-sm font-medium text-primary transition-colors group-hover:text-accent">{media.title}</h3>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-secondary">
        {year && <span>{year}</span>}
        {showRating && <span aria-label={t('catalog.media.ratingAlt', {
          rating: media.voteAverage.toFixed(1),
        })}>TMDB {media.voteAverage.toFixed(1)}/10</span>}
      </p>
      </Content>
    </article>
  )
}

export default MediaCard
