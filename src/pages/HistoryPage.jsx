import ViewingHistoryCard from '../features/viewingHistory/components/ViewingHistoryCard.jsx'
import { useViewingHistory } from '../features/viewingHistory/hooks/useViewingHistory.js'
import { groupViewingHistoryByMonth } from '../features/viewingHistory/presentation/groupViewingHistory.js'

function monthLabel(value) {
  const [year, month] = value.split('-').map(Number)

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}

export default function HistoryPage() {
  const {
    uid,
    data,
    loading,
    error,
    retry,
  } = useViewingHistory()

  if (loading) {
    return (
      <main className="space-y-4" aria-live="polite">
        <h1 className="text-3xl font-semibold tracking-tight">
          Viewing history
        </h1>

        <p className="text-zinc-400">
          Loading your viewing history…
        </p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Viewing history
        </h1>

        <p role="alert" className="text-zinc-400">
          Your viewing history could not be loaded.
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

  const groups = groupViewingHistoryByMonth(data)

  return (
    <main className="w-full min-w-0 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Viewing history
        </h1>

        <p className="text-zinc-400">
          {data.length === 1
            ? '1 viewing event'
            : `${data.length} viewing events`}
        </p>
      </header>

      {!data.length ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">
            No viewing history yet
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            Mark movies and TV shows as watched to start building your history.
          </p>
        </section>
      ) : (
        <div className="space-y-10">
          {groups.map(group => (
            <section
              key={group.month}
              aria-labelledby={`history-${group.month}`}
              className="space-y-4"
            >
              <div className="flex items-end justify-between gap-4">
                <h2
                  id={`history-${group.month}`}
                  className="text-xl font-semibold tracking-tight sm:text-2xl"
                >
                  {monthLabel(group.month)}
                </h2>

                <span className="text-sm text-zinc-500">
                  {group.events.length}
                </span>
              </div>

              <div className="grid gap-4">
                {group.events.map(event => (
                  <ViewingHistoryCard
                    key={event.eventId}
                    uid={uid}
                    event={event}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
