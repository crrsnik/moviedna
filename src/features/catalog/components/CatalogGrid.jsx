import MediaCard from './MediaCard.jsx'
import PersonCard from './PersonCard.jsx'
export default function CatalogGrid({ state }) {
  if (state.loading) return <p role="status" aria-live="polite" className="py-12 text-zinc-400">Loading catalog…</p>
  if (state.error) return <div className="space-y-4 py-8"><p role="alert">{state.error}</p><button type="button" onClick={state.retry} className="rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800 focus-visible:outline-2">Retry catalog</button></div>
  if (!state.data?.results.length) return <p role="status" className="py-12 text-zinc-400">No results found. Try another view or genre.</p>
  return <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
    {state.data.results.map((item) => item.mediaType === 'person' ? <PersonCard key={`person:${item.id}`} person={item} /> : <MediaCard key={`${item.mediaType}:${item.id}`} media={item} fluid showType />)}
  </div>
}
