import { formatRuntime } from '../services/detailHelpers.js'
export default function TvShowEpisodes({ lastEpisode, nextEpisode }) {
  if (!lastEpisode && !nextEpisode) return null
  return <section aria-labelledby="tv-episodes" className="space-y-5">
    <h2 id="tv-episodes" className="text-2xl font-semibold">Episodes</h2>
    <div className="grid gap-4 md:grid-cols-2">{[['Last aired episode', lastEpisode], ['Next episode', nextEpisode]].filter(([, episode]) => episode).map(([label, episode]) => <article key={label} className="min-w-0 space-y-2 rounded-lg border border-zinc-800 p-5">
      <p className="text-sm text-zinc-400">{label}</p><h3 className="break-words font-semibold">{episode.name}</h3>
      <p className="text-sm text-zinc-400">Season {episode.seasonNumber} · Episode {episode.episodeNumber}</p>
      <p className="text-sm text-zinc-400">{[episode.airDate, formatRuntime(episode.runtime)].filter(Boolean).join(' · ')}</p>
      {episode.overview && <p className="line-clamp-4 break-words text-sm text-zinc-300">{episode.overview}</p>}
    </article>)}</div>
  </section>
}
