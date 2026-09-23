import { Link } from 'react-router-dom'
import { isValidMovieId } from '../validation/detailRouteValidation.js'
import { useState } from 'react'
import { getTmdbPosterUrl } from '../services/tmdbImages.js'

function MediaCard({ media, fluid = false, showType = false }) {
  const posterUrl = getTmdbPosterUrl(media.posterPath)
  const [failedUrl, setFailedUrl] = useState(null)
  const showPoster = posterUrl && failedUrl !== posterUrl
  const year = media.releaseDate?.slice(0, 4)
  const showRating = media.voteAverage !== null && media.voteCount > 0

  const linked = media.mediaType === 'movie' && isValidMovieId(media.id)
  const Content = linked ? Link : 'div'
  return (
    <article className={`min-w-0 space-y-3 ${fluid ? 'w-full' : 'w-36 sm:w-44'}`}>
      <Content {...(linked ? { to: `/movies/${media.id}` } : {})} className="block space-y-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100">
      <div className="flex aspect-2/3 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        {showPoster ? (
          <img src={posterUrl} alt={`${media.title} poster`} width="342" height="513" loading="lazy" onError={() => setFailedUrl(posterUrl)} className="h-full w-full object-cover" />
        ) : (
          <span className="px-4 text-center text-sm text-zinc-500">No poster available</span>
        )}
      </div>
      {showType && <span className="text-xs text-zinc-400">{media.mediaType === 'movie' ? 'Movie' : 'TV'}</span>}
      <h3 className="line-clamp-2 break-words text-sm font-medium text-zinc-100">{media.title}</h3>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
        {year && <span>{year}</span>}
        {showRating && <span aria-label={`TMDB rating ${media.voteAverage.toFixed(1)} out of 10`}>TMDB {media.voteAverage.toFixed(1)}/10</span>}
      </p>
      </Content>
    </article>
  )
}

export default MediaCard
