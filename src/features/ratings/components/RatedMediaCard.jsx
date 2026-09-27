import { Link } from 'react-router-dom'
import DetailImage from '../../catalog/components/DetailImage.jsx'
import { getTmdbPosterUrl } from '../../catalog/services/tmdbImages.js'
import { savedMediaRoute } from '../../library/validation/libraryValidation.js'
import { libraryButton } from '../../library/components/LibraryDialog.jsx'
import { useRatingAction } from '../hooks/useRatingAction.js'
import { ratingService } from '../services/ratingService.js'
export default function RatedMediaCard({ uid, item }) {
  const action = useRatingAction()
  return <article className="min-w-0 space-y-3">
    <Link to={savedMediaRoute(item)} className="block space-y-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"><DetailImage src={getTmdbPosterUrl(item.posterPath)} alt={`${item.title} poster`} placeholder="No poster available" className="aspect-2/3 rounded-lg" /><h3 className="break-words font-medium">{item.title}</h3><p className="text-sm text-zinc-400">{[item.mediaType === 'movie' ? 'Movie' : 'TV', item.releaseYear].filter(Boolean).join(' · ')}</p></Link>
    <p>Your rating: {item.score}/10</p>
    <button type="button" className={libraryButton} disabled={action.pending} onClick={() => action.run('remove', () => ratingService.deleteRating(uid, item.key))}>{action.pending ? 'Removing…' : 'Remove rating'}</button>
    {action.error && <p role="alert">{action.error}</p>}
  </article>
}
