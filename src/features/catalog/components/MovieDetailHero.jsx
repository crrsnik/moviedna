import { Link } from 'react-router-dom'
import { getTmdbPosterUrl, getTmdbBackdropUrl } from '../services/tmdbImages.js'
import { formatRuntime } from '../services/normalizeMovieDetails.js'
import DetailImage from './DetailImage.jsx'

const link = 'inline-block rounded-lg border border-zinc-500 bg-zinc-950/70 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
export default function MovieDetailHero({ movie }) {
  return <header className="relative isolate min-h-112 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
    <DetailImage src={getTmdbBackdropUrl(movie.backdropPath)} alt="" placeholder="" lazy={false} className="absolute inset-0 -z-20" />
    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-zinc-950/85" />
    <div className="grid min-w-0 gap-6 p-5 sm:p-8 md:grid-cols-[15rem_minmax(0,1fr)]">
      <DetailImage src={getTmdbPosterUrl(movie.posterPath, 'w500')} alt={`${movie.title} poster`} placeholder="No poster available" lazy={false} className="mx-auto aspect-2/3 w-full max-w-60 rounded-lg" />
      <div className="min-w-0 space-y-4">
        <h1 className="break-words text-3xl font-semibold sm:text-4xl">{movie.title}</h1>
        <p className="flex flex-wrap gap-3 text-sm text-zinc-300">{[movie.releaseYear, formatRuntime(movie.runtime), movie.certification].filter(Boolean).map((value, i) => <span key={i}>{value}</span>)}</p>
        {movie.voteAverage !== null && movie.voteCount > 0 && <p className="text-sm">TMDB {movie.voteAverage.toFixed(1)}/10 · {movie.voteCount.toLocaleString('en-US')} votes</p>}
        {!!movie.genres.length && <ul aria-label="Genres" className="flex flex-wrap gap-2">{movie.genres.map((genre) => <li key={genre.id} className="rounded-full bg-zinc-800 px-3 py-1 text-xs">{genre.name}</li>)}</ul>}
        {movie.tagline && <p className="break-words italic text-zinc-300">{movie.tagline}</p>}
        <p className="break-words leading-relaxed text-zinc-200">{movie.overview || 'No overview available.'}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          {movie.trailer && <a href={movie.trailer.url} target="_blank" rel="noopener noreferrer" className={link}>Watch trailer</a>}
          <Link to="/movies" className={link}>Back to Movies</Link>
        </div>
      </div>
    </div>
  </header>
}
