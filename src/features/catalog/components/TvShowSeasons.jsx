import DetailImage from './DetailImage.jsx'
import { getTmdbPosterUrl } from '../services/tmdbImages.js'
export default function TvShowSeasons({ seasons }) {
  if (!seasons.length) return null
  return <section aria-labelledby="tv-seasons" className="min-w-0 space-y-5">
    <h2 id="tv-seasons" className="text-2xl font-semibold">Seasons</h2>
    <div role="region" aria-labelledby="tv-seasons" tabIndex={0} className="min-w-0 overflow-x-auto rounded-lg pb-4 focus-visible:outline-2 focus-visible:outline-offset-4">
      <ul className="flex gap-4">{seasons.map((season) => <li key={season.id} className="w-40 shrink-0 space-y-2 sm:w-48">
        <DetailImage src={getTmdbPosterUrl(season.posterPath)} alt={`${season.name} poster`} placeholder="No poster available" className="aspect-2/3 rounded-lg" />
        <h3 className="break-words text-sm font-semibold">{season.name}</h3>
        <p className="text-xs text-zinc-400">{[season.airDate?.slice(0, 4), season.episodeCount ? `${season.episodeCount} episodes` : null].filter(Boolean).join(' · ')}</p>
        {season.overview && <p className="line-clamp-3 break-words text-xs text-zinc-400">{season.overview}</p>}
      </li>)}</ul>
    </div>
  </section>
}
