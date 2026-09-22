export default function GenreFilter({ state, selected, onChange }) {
  return <section aria-label="Genres" className="min-w-0 space-y-3">
    {state.loading && <p role="status" className="text-sm text-zinc-400">Loading genres…</p>}
    {state.error && <div className="space-y-2"><p role="alert" className="text-sm text-amber-200">{state.error}</p><button type="button" onClick={state.retry} className="rounded px-2 py-1 underline focus-visible:outline-2">Retry genres</button></div>}
    <div className="flex max-w-full gap-2 overflow-x-auto px-1 py-2" aria-label="Genre filters">
      {[{ id: null, name: 'All genres' }, ...(state.data ?? [])].map((genre) => <button key={genre.id ?? 'all'} type="button" aria-pressed={selected === genre.id} onClick={() => onChange(genre.id)} className={`shrink-0 rounded-full border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 ${selected === genre.id ? 'bg-zinc-200 text-zinc-950 hover:bg-zinc-300' : 'text-zinc-300'}`}>{genre.name}</button>)}
    </div>
  </section>
}
