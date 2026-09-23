import { Link } from 'react-router-dom'
export default function DetailStatus({ loading, notFound, error, retry, noun, backTo, backLabel }) {
  return <section className="min-h-112 w-full self-start space-y-6" aria-busy={loading}>
    {loading ? <div role="status" aria-live="polite" className="min-h-112 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-8 motion-reduce:animate-none">Loading {noun.toLowerCase()}…</div> : <>
      <h1 className="text-3xl font-semibold">{notFound ? `${noun} not found` : `Unable to load ${noun.toLowerCase()}`}</h1>
      {!notFound && <><p role="alert">{error}</p><button type="button" onClick={retry} className="rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800 focus-visible:outline-2">Retry</button></>}
      <Link to={backTo} className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">{backLabel}</Link>
    </>}
  </section>
}
