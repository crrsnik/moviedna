import { useTrendingCatalog } from '../features/catalog/hooks/useTrendingCatalog.js'
import MediaRow from '../features/catalog/components/MediaRow.jsx'
import CatalogSectionState from '../features/catalog/components/CatalogSectionState.jsx'

function HomePage() {
  const { movies, tvShows } = useTrendingCatalog()
  const sections = [
    { id: 'trending-movies', title: 'Trending movies today', state: movies },
    { id: 'trending-tv', title: 'Trending TV shows today', state: tvShows },
  ]
  return (
    <div className="w-full min-w-0 space-y-12">
      <section className="space-y-5 py-4 text-center sm:py-8" aria-labelledby="home-title">
        <h1 id="home-title" className="text-4xl font-semibold tracking-tight sm:text-6xl">MovieDNA</h1>
        <p className="text-lg text-zinc-400">Discover your movie identity</p>
        <div className="mx-auto max-w-lg space-y-2 pt-3">
          <label htmlFor="catalog-search" className="sr-only">Search movies and TV shows (coming soon)</label>
          <input id="catalog-search" type="search" disabled placeholder="Search movies and TV shows" aria-describedby="search-note" className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm placeholder:text-zinc-500 disabled:cursor-not-allowed" />
          <p id="search-note" className="text-xs text-zinc-500">Search is coming soon.</p>
        </div>
      </section>
      {sections.map(({ id, title, state }) => (
        <section key={id} aria-labelledby={id} className="min-w-0 space-y-5">
          <h2 id={id} className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          {state.isLoading || state.error || state.data.length === 0 ? (
            <CatalogSectionState isLoading={state.isLoading} error={state.error} onRetry={state.retry} />
          ) : <MediaRow items={state.data} labelledBy={id} />}
        </section>
      ))}
    </div>
  )
}

export default HomePage
