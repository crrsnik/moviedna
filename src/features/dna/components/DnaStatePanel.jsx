const messages = {
  loading: ['Loading your MovieDNA…', 'Your private profile is being loaded.'],
  empty: ['Your MovieDNA is not ready yet', 'Add ratings, favorites, or onboarding reactions to build your profile.'],
  running: ['Building your MovieDNA…', 'Your first profile is being calculated locally.'],
  insufficient: ['More signals are needed', 'Rate or favorite more movies and TV shows to strengthen your profile.'],
  malformed: ['This MovieDNA version cannot be displayed', 'Refresh the page later after the profile has been recalculated.'],
  error: ["We couldn't load your MovieDNA", 'Check the local Emulator stack and try again.'],
}

export default function DnaStatePanel({ kind }) {
  const [title, detail] = messages[kind] ?? messages.error
  return <section aria-labelledby="dna-state-title" className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
    <h1 id="dna-state-title" className="text-2xl font-semibold">{title}</h1>
    <p role="status" aria-live="polite" className="mt-3 text-zinc-300">{detail}</p>
  </section>
}
