import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth.js'
import { useMediaLibrary } from '../features/library/hooks/useMediaLibrary.js'
import { normalizeLibraryView, libraryViewParams } from '../features/library/validation/libraryValidation.js'
import LibraryViewTabs from '../features/library/components/LibraryViewTabs.jsx'
import SavedMediaCard from '../features/library/components/SavedMediaCard.jsx'
function LibraryContent({ uid, view }) {
  const { data, loading, error, retry } = useMediaLibrary(uid, view)
  if (loading) return <p role="status" aria-live="polite">Loading your library…</p>
  if (error) return <div className="space-y-3"><p role="alert">{error}</p><button type="button" onClick={retry} className="rounded border border-zinc-700 px-4 py-2 hover:bg-zinc-800 focus-visible:outline-2">Retry library</button></div>
  if (!data?.length) return <p>{view === 'favorites' ? 'No favorites yet. Save a movie or TV show to get started.' : 'Your To Watch list is empty. Save something to watch later.'}</p>
  return <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{data.map(item => <SavedMediaCard key={item.key} item={item} uid={uid} view={view} />)}</div>
}
export default function LibraryPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const view = normalizeLibraryView(params.get('view'))
  const canonical = libraryViewParams(view).toString()
  useEffect(() => { if (params.toString() !== canonical) setParams(canonical, { replace: true }) }, [params, canonical, setParams])
  return <section className="w-full min-w-0 self-start space-y-6"><h1 className="text-3xl font-semibold">My Library</h1><LibraryViewTabs view={view} /><LibraryContent key={`${user.uid}:${view}`} uid={user.uid} view={view} /></section>
}
