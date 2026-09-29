import { useMemo } from 'react'

import { calculateViewingStats } from '../features/statistics/core/calculateViewingStats.js'
import { useViewingHistory } from '../features/viewingHistory/hooks/useViewingHistory.js'
import { localDateString } from '../features/viewingHistory/validation/viewingHistoryValidation.js'

function monthLabel(value) {
  const [year, month] = value.split('-').map(Number)

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function MetricCard({ label, value, description }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>

      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-sm text-zinc-500">
          {description}
        </p>
      )}
    </article>
  )
}

function RankedList({ title, items, emptyText }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-lg font-semibold">
        {title}
      </h2>

      {!items.length ? (
        <p className="mt-4 text-sm text-zinc-500">
          {emptyText}
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id ?? item.decade}
              className="flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <span className="mr-3 text-sm text-zinc-500">
                  {index + 1}
                </span>

                <span className="font-medium">
                  {item.name ?? item.label}
                </span>
              </div>

              <span className="shrink-0 text-sm text-zinc-400">
                {item.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function MediaTypeBreakdown({ mediaTypes }) {
  const moviePercent = Math.round(
    mediaTypes.movieShare * 100,
  )

  const tvPercent = Math.round(
    mediaTypes.tvShare * 100,
  )

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-lg font-semibold">
        Movies vs TV
      </h2>

      <div className="mt-5 space-y-5">
        <div>
          <div className="flex justify-between gap-4 text-sm">
            <span>Movies</span>
            <span className="text-zinc-400">
              {mediaTypes.movieCount} · {moviePercent}%
            </span>
          </div>

          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-zinc-300"
              style={{ width: `${moviePercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between gap-4 text-sm">
            <span>TV shows</span>
            <span className="text-zinc-400">
              {mediaTypes.tvCount} · {tvPercent}%
            </span>
          </div>

          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-zinc-500"
              style={{ width: `${tvPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function ActivityChart({ activity }) {
  const maximum = Math.max(
    1,
    ...activity.map(item => item.count),
  )

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          This year's activity
        </h2>

        <p className="text-sm text-zinc-500">
          Viewing events by month
        </p>
      </div>

      <div
        className="mt-6 flex h-48 items-end gap-2"
        aria-label="Viewing activity by month"
      >
        {activity.map(item => {
          const height = item.count
            ? Math.max(
                8,
                Math.round(
                  (item.count / maximum) * 100,
                ),
              )
            : 2

          return (
            <div
              key={item.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <span className="text-xs text-zinc-400">
                {item.count}
              </span>

              <div className="flex h-32 w-full items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-t bg-zinc-300"
                  style={{ height: `${height}%` }}
                  title={`${item.month}: ${item.count} viewing events`}
                />
              </div>

              <span className="text-xs text-zinc-500">
                {monthLabel(item.month)}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function StatisticsPage() {
  const {
    data,
    loading,
    error,
    retry,
  } = useViewingHistory()

  const today = localDateString()

  const stats = useMemo(
    () => calculateViewingStats(data, today),
    [data, today],
  )

  if (loading) {
    return (
      <main className="space-y-4" aria-live="polite">
        <h1 className="text-3xl font-semibold tracking-tight">
          Statistics
        </h1>

        <p className="text-zinc-400">
          Calculating your viewing statistics…
        </p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Statistics
        </h1>

        <p role="alert" className="text-zinc-400">
          Your viewing statistics could not be loaded.
        </p>

        <button
          type="button"
          onClick={retry}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-800"
        >
          Try again
        </button>
      </main>
    )
  }

  return (
    <main className="w-full min-w-0 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Statistics
        </h1>

        <p className="text-zinc-400">
          Your viewing activity based on titles marked as watched.
        </p>
      </header>

      <section
        aria-label="Viewing totals"
        className="grid gap-4 sm:grid-cols-3"
      >
        <MetricCard
          label="This month"
          value={stats.thisMonth}
          description="Viewing events"
        />

        <MetricCard
          label="This year"
          value={stats.thisYear}
          description="Viewing events"
        />

        <MetricCard
          label="All time"
          value={stats.totalViewings}
          description="Viewing events"
        />
      </section>

      {!stats.totalViewings ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">
            No viewing statistics yet
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            Mark movies and TV shows as watched to start building your statistics.
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <MediaTypeBreakdown
              mediaTypes={stats.mediaTypes}
            />

            <RankedList
              title="Favorite eras"
              items={stats.topDecades}
              emptyText="No release-year data yet."
            />
          </div>

          <ActivityChart
            activity={stats.monthlyActivity}
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <RankedList
              title="Most watched genres"
              items={stats.topGenres}
              emptyText="No genre data yet."
            />

            <RankedList
              title="Most watched directors"
              items={stats.topDirectors}
              emptyText="No movie director data yet."
            />

            <RankedList
              title="Most watched TV creators"
              items={stats.topCreators}
              emptyText="No TV creator data yet."
            />
          </div>
        </>
      )}
    </main>
  )
}
