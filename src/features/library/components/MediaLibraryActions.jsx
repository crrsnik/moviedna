import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { useSavedMediaStatus } from '../hooks/useSavedMediaStatus.js'
import { useLibraryAction } from '../hooks/useLibraryAction.js'
import { detailToSnapshot, getMediaKey } from '../validation/libraryValidation.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'
const button = 'rounded-lg border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-50'
function AuthenticatedActions({ uid, media }) {
  const { data, loading, error, retry } = useSavedMediaStatus(uid, media)
  const action = useLibraryAction()
  return <section aria-label="Save to library" className="space-y-3">
    <div className="flex flex-wrap gap-3">
      <button type="button" className={button} disabled={loading || Boolean(error) || action.pending} aria-pressed={Boolean(data?.favorite)} onClick={() => action.run(() => mediaLibraryService.toggleFavorite({ uid, media }))}>{data?.favorite ? 'Remove from Favorites' : 'Add to Favorites'}</button>
      <button type="button" className={button} disabled={loading || Boolean(error) || action.pending} aria-pressed={Boolean(data?.watchlist)} onClick={() => action.run(() => mediaLibraryService.toggleWatchlist({ uid, media }))}>{data?.watchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}</button>
    </div>
    {(loading || action.pending) && <p role="status" aria-live="polite">{action.pending ? 'Saving…' : 'Loading saved status…'}</p>}
    {(error || action.error) && <p role="alert">{error || action.error}</p>}
    {error && <button type="button" className={button} onClick={retry}>Retry saved status</button>}
  </section>
}
export default function MediaLibraryActions({ mediaType, detail }) {
  const { user } = useAuth()
  if (!user) return <Link to="/login" className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Log in to save</Link>
  let media
  try { media = detailToSnapshot(mediaType, detail) } catch { return <p role="alert">This title cannot be saved.</p> }
  return <AuthenticatedActions key={`${user.uid}:${getMediaKey(mediaType, media.tmdbId)}`} uid={user.uid} media={media} />
}
