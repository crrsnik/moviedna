import {
  useTranslation,
} from '../features/localization/hooks/useTranslation.js'
import ViewingHistoryCard from '../features/viewingHistory/components/ViewingHistoryCard.jsx'
import { useViewingHistory } from '../features/viewingHistory/hooks/useViewingHistory.js'
import {
  groupViewingHistoryByMonth,
} from '../features/viewingHistory/presentation/groupViewingHistory.js'

function monthLabel(value, locale) {
  const [year, month] = (
    value.split('-').map(Number)
  )

  return new Intl.DateTimeFormat(
    locale,
    {
      month: 'long',
      year: 'numeric',
    },
  ).format(
    new Date(year, month - 1, 1),
  )
}

export default function HistoryPage() {
  const { t, locale } = useTranslation()

  const {
    uid,
    data,
    loading,
    error,
    retry,
  } = useViewingHistory()

  if (loading) {
    return (
      <main
        className="space-y-4"
        aria-live="polite"
      >
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('viewingHistoryUi.title')}
        </h1>

        <p className="text-zinc-400">
          {t('viewingHistoryUi.loading')}
        </p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('viewingHistoryUi.title')}
        </h1>

        <p
          role="alert"
          className="text-zinc-400"
        >
          {t('viewingHistoryUi.loadError')}
        </p>

        <button
          type="button"
          onClick={retry}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-800"
        >
          {t('viewingHistoryUi.retry')}
        </button>
      </main>
    )
  }

  const groups = (
    groupViewingHistoryByMonth(data)
  )

  return (
    <main className="w-full min-w-0 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('viewingHistoryUi.title')}
        </h1>

        <p className="text-zinc-400">
          {data.length === 1
            ? t('viewingHistoryUi.countOne')
            : t(
              'viewingHistoryUi.countMany',
              { count: data.length },
            )}
        </p>
      </header>

      {!data.length ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">
            {t(
              'viewingHistoryUi.emptyTitle',
            )}
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            {t(
              'viewingHistoryUi.emptyDescription',
            )}
          </p>
        </section>
      ) : (
        <div className="space-y-10">
          {groups.map(group => (
            <section
              key={group.month}
              aria-labelledby={
                `history-${group.month}`
              }
              className="space-y-4"
            >
              <div className="flex items-end justify-between gap-4">
                <h2
                  id={`history-${group.month}`}
                  className="text-xl font-semibold tracking-tight sm:text-2xl"
                >
                  {monthLabel(
                    group.month,
                    locale,
                  )}
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
