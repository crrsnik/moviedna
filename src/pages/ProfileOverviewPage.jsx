import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useMovieDna } from '../features/dna/hooks/useMovieDna.js'
import { calculateViewingStats } from '../features/statistics/core/calculateViewingStats.js'
import { useViewingHistory } from '../features/viewingHistory/hooks/useViewingHistory.js'
import { localDateString } from '../features/viewingHistory/validation/viewingHistoryValidation.js'

function DnaPreview({ state }) {
  if (!state.current) {
    return (
      <p className="text-sm text-zinc-400">
        {state.kind === 'failed'
          ? 'Your MovieDNA preview could not be loaded.'
          : 'Your MovieDNA is still being prepared.'}
      </p>
    )
  }

  const genres = [...(state.current.dimensions?.genres ?? [])]
    .filter(entry => (
      entry
      && typeof entry.label === 'string'
      && typeof entry.score === 'number'
      && entry.score > 0
    ))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  if (!genres.length) {
    return (
      <p className="text-sm text-zinc-400">
        Not enough genre evidence yet.
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {genres.map((entry) => {
        const percent = Math.round(entry.score * 100)

        return (
          <article
            key={entry.key}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-semibold">
                {entry.label}
              </h3>

              <span className="text-sm font-medium text-zinc-300">
                +{percent}%
              </span>
            </div>

            <progress
              aria-label={`${entry.label} MovieDNA compatibility`}
              value={percent}
              max="100"
              className="mt-3 h-2 w-full accent-violet-400"
            />

          </article>
        )
      })}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-sm text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">
        {value}
      </p>
    </div>
  )
}

export default function ProfileOverviewPage() {
  const dnaState = useMovieDna()
  const history = useViewingHistory()
  const today = localDateString()

  const stats = useMemo(
    () => calculateViewingStats(
      Array.isArray(history.data) ? history.data : [],
      today,
    ),
    [history.data, today],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              Your MovieDNA
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              A preview of your strongest positive genre signals.
            </p>
          </div>

          <Link
            to="/profile/dna"
            className="rounded-md text-sm font-medium text-zinc-200 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            View full DNA
          </Link>
        </div>

        <div className="mt-5">
          <DnaPreview state={dnaState} />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              Your activity
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              A quick look at your viewing history.
            </p>
          </div>

          <Link
            to="/profile/stats"
            className="rounded-md text-sm font-medium text-zinc-200 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            View statistics
          </Link>
        </div>

        {history.loading ? (
          <p role="status" className="mt-5 text-sm text-zinc-400">
            Loading viewing activity…
          </p>
        ) : history.error ? (
          <p role="alert" className="mt-5 text-sm text-zinc-400">
            Viewing activity could not be loaded.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="All time"
              value={stats.totalViewings}
            />
            <Stat
              label="This month"
              value={stats.thisMonth}
            />
            <Stat
              label="Movies"
              value={stats.mediaTypes.movieCount}
            />
            <Stat
              label="TV shows"
              value={stats.mediaTypes.tvCount}
            />
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          to="/profile/library"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <h2 className="text-lg font-semibold">
            Library
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Favorites, watchlist, ratings, and custom lists.
          </p>
        </Link>

        <Link
          to="/profile/history"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <h2 className="text-lg font-semibold">
            History
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Browse the movies and TV shows you've watched.
          </p>
        </Link>

        <Link
          to="/profile/settings"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <h2 className="text-lg font-semibold">
            Profile settings
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Change your name, avatar, and privacy.
          </p>
        </Link>
      </section>
    </div>
  )
}
