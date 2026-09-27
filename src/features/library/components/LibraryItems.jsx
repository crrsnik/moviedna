import { useLibrarySubscription } from '../hooks/useLibrarySubscription.js'
import SavedMediaCard from './SavedMediaCard.jsx'
import { libraryButton } from './LibraryDialog.jsx'
export default function LibraryItems({ uid, view, listId }) {
  const { data, loading, error, retry } = useLibrarySubscription({ uid, view, listId, kind: listId ? 'items' : undefined })
  if (loading) return <p role="status" aria-live="polite">Loading your library…</p>
  if (error) return <div className="space-y-3"><p role="alert">{error}</p><button type="button" onClick={retry} className={libraryButton}>Retry library</button></div>
  if (!data?.length) return <p>{listId ? 'This list is empty. Add movies or TV shows with Manage lists on a title page.' : view === 'favorites' ? 'No favorites yet. Save a movie or TV show to get started.' : 'Your To Watch list is empty. Save something to watch later.'}</p>
  return <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{data.map(item => <SavedMediaCard key={item.key} item={item} uid={uid} view={view} listId={listId} />)}</div>
}
