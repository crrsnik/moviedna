function compatibility(score) {
  if (score >= 0.35) return 'Strong match'
  if (score > 0.05) return 'Positive match'
  if (score <= -0.2) return 'Lower compatibility'
  return 'Neutral or mixed'
}

export default function DnaDimensionSection({ id, title, entries }) {
  return <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
    <h2 id={`${id}-title`} className="text-xl font-semibold">{title}</h2>
    {entries.length ? <ul className="mt-4 space-y-3">{entries.map((entry) => {
      const percent = Math.round(Math.abs(entry.score) * 100)
      const description = compatibility(entry.score)
      return <li key={entry.key} className="rounded-xl bg-zinc-950 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="break-words">{entry.label}</strong><span className="text-sm text-zinc-300">{description} · {entry.score >= 0 ? '+' : '−'}{percent}%</span></div>
        <p className="mt-2 text-sm text-zinc-400">Evidence from {entry.evidenceCount} {entry.evidenceCount === 1 ? 'title' : 'titles'} · confidence {Math.round(entry.confidence * 100)}%</p>
        <progress aria-label={`${entry.label} compatibility strength`} value={percent} max="100" className="mt-2 h-2 w-full accent-violet-400" />
      </li>
    })}</ul> : <p className="mt-3 text-sm text-zinc-400">Not enough evidence yet.</p>}
  </section>
}
