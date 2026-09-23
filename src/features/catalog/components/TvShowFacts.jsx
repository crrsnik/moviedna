export default function TvShowFacts({ series }) {
  const names = (items) => items.map((item) => item.name).join(', ')
  const facts = [
    ['Original name', series.originalName], ['Creators', names(series.creators)], ['Status', series.status], ['Type', series.type],
    ['Original language', series.originalLanguage], ['Origin countries', series.originCountries.join(', ')], ['Networks', names(series.networks)],
    ['Production companies', names(series.productionCompanies)], ['Seasons', series.numberOfSeasons], ['Episodes', series.numberOfEpisodes],
  ].filter(([, value]) => value)
  if (!facts.length && !series.homepage) return null
  return <section aria-labelledby="tv-facts" className="space-y-5">
    <h2 id="tv-facts" className="text-2xl font-semibold">About this TV show</h2>
    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{facts.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-zinc-400">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
    {series.homepage && <a href={series.homepage} target="_blank" rel="noopener noreferrer" className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Official website</a>}
  </section>
}
