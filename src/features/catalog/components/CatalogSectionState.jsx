function CatalogSectionState({ isLoading, error, onRetry }) {
  if (isLoading) {
    return <p role="status" aria-live="polite" className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-sm text-zinc-400 motion-reduce:animate-none">Loading titles…</p>
  }
  if (error) {
    return (
      <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <p role="alert" className="text-sm text-zinc-300">{error}</p>
        <button type="button" onClick={onRetry} className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100">Retry</button>
      </div>
    )
  }
  return <p className="text-sm text-zinc-400">No trending titles available right now.</p>
}

export default CatalogSectionState
