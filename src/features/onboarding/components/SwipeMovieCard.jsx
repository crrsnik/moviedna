import { useRef, useState } from 'react'
import { getTmdbPosterUrl } from '../../catalog/services/tmdbImages.js'
import { getKeyboardReaction, getSwipeReaction } from '../utils/onboardingDeck.js'

function SwipeMovieCard({ movie, disabled, onReact }) {
  const start = useRef(null)
  const [direction, setDirection] = useState(null)
  const [failedUrl, setFailedUrl] = useState(null)
  const poster = getTmdbPosterUrl(movie.posterPath, 'w500')

  function resetDrag() { start.current = null; setDirection(null) }
  function handlePointerDown(event) {
    if (disabled || !event.isPrimary || event.button !== 0 || start.current) return
    start.current = { id: event.pointerId, movieId: movie.id, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function handlePointerMove(event) {
    const point = start.current
    if (!point || point.id !== event.pointerId || point.movieId !== movie.id || disabled) return
    const x = event.clientX - point.x, y = event.clientY - point.y
    setDirection(getSwipeReaction(x, y))
  }
  function handlePointerUp(event) {
    const point = start.current
    resetDrag()
    if (!point || point.id !== event.pointerId || point.movieId !== movie.id || disabled) return
    const reaction = getSwipeReaction(event.clientX - point.x, event.clientY - point.y)
    if (reaction) onReact(reaction)
  }
  function handleKeyDown(event) {
    if (disabled || event.target !== event.currentTarget) return
    const reaction = getKeyboardReaction(event)
    if (reaction) { event.preventDefault(); onReact(reaction) }
  }

  return (
    <article
      tabIndex={0} aria-label={`${movie.title}. Left arrow to dislike, right arrow to like, down arrow to skip.`}
      aria-disabled={disabled} aria-describedby="onboarding-controls-help"
      onKeyDown={handleKeyDown} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp} onPointerCancel={resetDrag} onLostPointerCapture={resetDrag}
      className={`relative mx-auto w-full max-w-sm touch-pan-y select-none overflow-hidden rounded-2xl border bg-zinc-900 shadow-xl transition-transform motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 ${direction === 'like' ? 'rotate-2 border-emerald-400' : direction === 'dislike' ? '-rotate-2 border-rose-400' : 'border-zinc-700'} ${disabled ? 'opacity-70' : ''}`}
    >
      <div className="flex aspect-4/3 items-center justify-center overflow-hidden bg-zinc-800">
        {poster && failedUrl !== poster ? <img src={poster} alt={`${movie.title} poster`} width="500" height="750" draggable={false} onError={() => setFailedUrl(poster)} className="h-full w-full object-contain" /> : <span className="text-sm text-zinc-400">No poster available</span>}
      </div>
      {direction && <span aria-hidden="true" className="absolute left-4 top-4 rounded-md bg-zinc-950 px-4 py-2 font-bold uppercase">{direction}</span>}
      <div className="space-y-3 p-5">
        <h2 className="break-words text-xl font-semibold">{movie.title}</h2>
        <p className="flex flex-wrap gap-4 text-sm text-zinc-400">
          {movie.releaseDate && <span>{movie.releaseDate.slice(0, 4)}</span>}
          {movie.voteAverage !== null && movie.voteCount > 0 && <span>TMDB {movie.voteAverage.toFixed(1)}/10</span>}
        </p>
        <p className="line-clamp-4 text-sm leading-relaxed text-zinc-300">{movie.overview || 'No overview available.'}</p>
      </div>
    </article>
  )
}

export default SwipeMovieCard
