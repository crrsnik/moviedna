import { PersonNames } from './PersonLink.jsx'
import { formatMoney } from '../services/normalizeMovieDetails.js'
export default function MovieFacts({ movie }) {
  const names = (items) => items.map((item) => item.name).join(', ')
  const facts = [
    ['Original title', movie.originalTitle], ['Directors', movie.directors.length > 0 && <PersonNames key="directors" people={movie.directors} />], ['Writers', movie.writers.length > 0 && <PersonNames key="writers" people={movie.writers} />],
    ['Status', movie.status], ['Original language', movie.originalLanguage], ['Production countries', names(movie.productionCountries)],
    ['Production companies', names(movie.productionCompanies)], ['Budget', formatMoney(movie.budget)], ['Revenue', formatMoney(movie.revenue)],
  ].filter(([, value]) => value)
  if (!facts.length && !movie.homepage) return null
  return <section aria-labelledby="movie-facts" className="space-y-5">
    <h2 id="movie-facts" className="text-2xl font-semibold">About this movie</h2>
    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{facts.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-zinc-400">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
    {movie.homepage && <a href={movie.homepage} target="_blank" rel="noopener noreferrer" className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Official website</a>}
  </section>
}
