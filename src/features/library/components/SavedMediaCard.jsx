import { Link } from 'react-router-dom'
import DetailImage from '../../catalog/components/DetailImage.jsx'
import { getTmdbPosterUrl } from '../../catalog/services/tmdbImages.js'
import { savedMediaRoute } from '../validation/libraryValidation.js'
import { useLibraryAction } from '../hooks/useLibraryAction.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'
export default function SavedMediaCard({ item, uid, view }) {
  const action = useLibraryAction()
  return <article className="min-w-0 space-y-3">
    <Link to={savedMediaRoute(item)} className="block space-y-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4">
      <DetailImage src={getTmdbPosterUrl(item.posterPath)} alt={`${item.title} poster`} placeholder="No poster available" className="aspect-2/3 rounded-lg" />
      <h2 className="break-words font-medium">{item.title}</h2>
      <p className="text-sm text-zinc-400">{[item.mediaType === 'movie' ? 'Movie' : 'TV', item.releaseYear].filter(Boolean).join(' · ')}</p>
    </Link>
    <button type="button" disabled={action.pending} onClick={() => action.run(() => mediaLibraryService.removeFromView({ uid, view, media: item }))} className="rounded border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50">{action.pending ? 'Saving…' : view === 'favorites' ? 'Remove from Favorites' : 'Remove from To Watch'}</button>
    {action.error && <p role="alert" className="text-sm text-red-300">{action.error}</p>}
  </article>
}
