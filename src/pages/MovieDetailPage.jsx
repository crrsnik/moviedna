import { useLayoutEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMovieDetails } from '../features/catalog/hooks/useMovieDetails.js'
import MovieDetailHero from '../features/catalog/components/MovieDetailHero.jsx'
import MovieFacts from '../features/catalog/components/MovieFacts.jsx'
import MovieCredits from '../features/catalog/components/MovieCredits.jsx'
import MediaRow from '../features/catalog/components/MediaRow.jsx'

export default function MovieDetailPage() {
  const { movieId } = useParams()
  const { data, loading, notFound, error, retry } = useMovieDetails(movieId)
  useLayoutEffect(() => {
    document.title = data ? `${data.title} — MovieDNA` : 'Movie details — MovieDNA'
    return () => { document.title = 'MovieDNA' }
  }, [data])
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [movieId])
  if (!data) return <section className="min-h-112 w-full self-start space-y-6" aria-busy={loading}>
    {loading ? <div role="status" aria-live="polite" className="min-h-112 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-8 motion-reduce:animate-none">Loading movie…</div> : <>
      <h1 className="text-3xl font-semibold">{notFound ? 'Movie not found' : 'Unable to load movie'}</h1>
      {!notFound && <><p role="alert">{error}</p><button type="button" onClick={retry} className="rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800 focus-visible:outline-2">Retry</button></>}
      <Link to="/movies" className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Back to Movies</Link>
    </>}
  </section>
  return <div className="w-full min-w-0 self-start space-y-10">
    <MovieDetailHero movie={data} />
    <MovieFacts movie={data} />
    <MovieCredits cast={data.cast} />
    {!!data.recommendations.length && <section aria-labelledby="movie-recommendations" className="min-w-0 space-y-5"><h2 id="movie-recommendations" className="text-2xl font-semibold">You may also like</h2><MediaRow items={data.recommendations} labelledBy="movie-recommendations" /></section>}
  </div>
}
