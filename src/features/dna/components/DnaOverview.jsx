function Percentage({ label, value }) {
  const percentage = Math.round(value * 100)
  return <div className="space-y-2"><div className="flex justify-between gap-3"><span>{label}</span><strong>{percentage}%</strong></div><progress aria-label={label} value={percentage} max="100" className="h-2 w-full accent-violet-400" /></div>
}

export default function DnaOverview({ dna }) {
  const counts = dna.sourceCounts
  return <section aria-labelledby="dna-overview-title" className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
    <h2 id="dna-overview-title" className="text-2xl font-semibold">Profile overview</h2>
    <div className="grid gap-5 sm:grid-cols-2"><Percentage label="Profile confidence" value={dna.confidence} /><Percentage label="Metadata coverage" value={dna.metadataCoverage} /></div>
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div><dt className="text-zinc-400">Signals used</dt><dd className="text-lg font-semibold">{counts.uniqueNonZeroUsed}</dd></div>
      <div><dt className="text-zinc-400">Ratings</dt><dd className="text-lg font-semibold">{counts.ratingUsed}</dd></div>
      <div><dt className="text-zinc-400">Onboarding</dt><dd className="text-lg font-semibold">{counts.onboardingUsed}</dd></div>
      <div><dt className="text-zinc-400">Favorites</dt><dd className="text-lg font-semibold">{counts.favoriteUsed}</dd></div>
      <div><dt className="text-zinc-400">Algorithm</dt><dd>{dna.algorithmVersion}</dd></div>
      <div className="sm:col-span-2"><dt className="text-zinc-400">Last calculated</dt><dd><time dateTime={dna.calculatedAt}>{new Date(dna.calculatedAt).toLocaleString()}</time></dd></div>
    </dl>
  </section>
}
