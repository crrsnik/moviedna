import { getTmdbProfileUrl } from '../services/tmdbImages.js'
import DetailImage from './DetailImage.jsx'
export default function MovieCredits({ cast }) {
  if (!cast.length) return null
  return <section aria-labelledby="movie-cast" className="space-y-5">
    <h2 id="movie-cast" className="text-2xl font-semibold">Cast</h2>
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{cast.map((person) => <li key={person.id} className="min-w-0 space-y-2">
      <DetailImage src={getTmdbProfileUrl(person.profilePath)} alt={person.name} placeholder="No photo available" className="aspect-2/3 rounded-lg" />
      <p className="break-words text-sm font-medium">{person.name}</p>
      {person.character && <p className="break-words text-xs text-zinc-400">{person.character}</p>}
    </li>)}</ul>
  </section>
}
