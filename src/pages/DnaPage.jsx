import DnaDimensionSection from '../features/dna/components/DnaDimensionSection.jsx'
import DnaOverview from '../features/dna/components/DnaOverview.jsx'
import DnaStatePanel from '../features/dna/components/DnaStatePanel.jsx'
import { useMovieDna } from '../features/dna/hooks/useMovieDna.js'

const dimensions = [['genres', 'Genres'], ['mediaTypes', 'Movies and TV'], ['decades', 'Decades'], ['languages', 'Languages'], ['countries', 'Countries'], ['directors', 'Directors'], ['creators', 'Creators'], ['actors', 'Actors']]

export default function DnaPage() {
  const state = useMovieDna()
  if (!state.current && state.kind !== 'failed') return <DnaStatePanel kind={state.kind} />
  if (state.kind === 'failed' && !state.current) return <DnaStatePanel kind="error" />
  const dna = state.current
  return <div className="w-full min-w-0 self-start space-y-6">
    <header className="max-w-3xl space-y-2"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My DNA</h1><p className="text-zinc-300">A private, deterministic view of the signals you have shared with MovieDNA.</p></header>
    {(state.kind === 'stale' || state.kind === 'failed') && <div role={state.kind === 'failed' ? 'alert' : 'status'} aria-live="polite" className="rounded-xl border border-amber-700/60 bg-amber-950/40 p-4 text-amber-100">{state.kind === 'stale' ? 'Updating your MovieDNA. Your previous profile remains visible.' : "The latest update failed. Your previous confirmed profile remains visible."}</div>}
    <DnaOverview dna={dna} />
    <div className="grid gap-5 lg:grid-cols-2">{dimensions.map(([id, title]) => <DnaDimensionSection key={id} id={id} title={title} entries={dna.dimensions[id]} />)}</div>
  </div>
}
