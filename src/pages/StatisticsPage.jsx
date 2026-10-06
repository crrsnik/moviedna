import { useMemo } from 'react'

import {
  useTranslation,
} from '../features/localization/hooks/useTranslation.js'
import {
  calculateViewingStats,
} from '../features/statistics/core/calculateViewingStats.js'
import { useViewingHistory } from '../features/viewingHistory/hooks/useViewingHistory.js'
import {
  localDateString,
} from '../features/viewingHistory/validation/viewingHistoryValidation.js'

function monthLabel(value, locale) {
  const [year, month] = (
    value.split('-').map(Number)
  )

  return new Intl.DateTimeFormat(
    locale,
    {
      month: 'short',
      timeZone: 'UTC',
    },
  ).format(
    new Date(
      Date.UTC(year, month - 1, 1),
    ),
  )
}

function MetricCard({
  label,
  value,
  description,
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-secondary">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-sm text-tertiary">
          {description}
        </p>
      )}
    </article>
  )
}

function RankedList({
  title,
  items,
  emptyText,
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">
        {title}
      </h2>

      {!items.length ? (
        <p className="mt-4 text-sm text-tertiary">
          {emptyText}
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li
              key={
                item.id ?? item.decade
              }
              className="flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <span className="mr-3 text-sm text-tertiary">
                  {index + 1}
                </span>

                <span className="font-medium">
                  {item.name ?? item.label}
                </span>
              </div>

              <span className="shrink-0 text-sm text-secondary">
                {item.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function MediaTypeBreakdown({
  mediaTypes,
}) {
  const { t } = useTranslation()

  const moviePercent = Math.round(
    mediaTypes.movieShare * 100,
  )

  const tvPercent = Math.round(
    mediaTypes.tvShare * 100,
  )

  const movieBarClass = (
    mediaTypes.movieCount >= mediaTypes.tvCount
      ? 'bg-accent-hover'
      : 'bg-zinc-500'
  )

  const tvBarClass = (
    mediaTypes.tvCount >= mediaTypes.movieCount
      ? 'bg-accent-hover'
      : 'bg-zinc-500'
  )

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">
        {t('statisticsUi.mediaTypesTitle')}
      </h2>

      <div className="mt-5 space-y-5">
        <div>
          <div className="flex justify-between gap-4 text-sm">
            <span>
              {t('statisticsUi.movies')}
            </span>

            <span className="text-secondary">
              {mediaTypes.movieCount}
              {' · '}
              {moviePercent}%
            </span>
          </div>

          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
            aria-hidden="true"
          >
            <div
              className={`h-full rounded-full ${movieBarClass}`}
              style={{
                width: `${moviePercent}%`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between gap-4 text-sm">
            <span>
              {t('statisticsUi.tvShows')}
            </span>

            <span className="text-secondary">
              {mediaTypes.tvCount}
              {' · '}
              {tvPercent}%
            </span>
          </div>

          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
            aria-hidden="true"
          >
            <div
              className={`h-full rounded-full ${tvBarClass}`}
              style={{
                width: `${tvPercent}%`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function ActivityChart({ activity }) {
  const { t, locale } = useTranslation()

  const maximum = Math.max(
    1,
    ...activity.map(item => item.count),
  )

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          {t('statisticsUi.activityTitle')}
        </h2>

        <p className="text-sm text-tertiary">
          {t(
            'statisticsUi.activityDescription',
          )}
        </p>
      </div>

      <div
        className="mt-6 flex h-48 items-end gap-2"
        aria-label={t(
          'statisticsUi.activityAria',
        )}
      >
        {activity.map(item => {
          const height = item.count
            ? Math.max(
              8,
              Math.round(
                (
                  item.count
                  / maximum
                ) * 100,
              ),
            )
            : 2

          const label = monthLabel(
            item.month,
            locale,
          )

          return (
            <div
              key={item.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <span className="text-xs text-secondary">
                {item.count}
              </span>

              <div className="flex h-32 w-full items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-t bg-accent-hover"
                  style={{
                    height: `${height}%`,
                  }}
                  title={t(
                    'statisticsUi.activityBarTitle',
                    {
                      month: label,
                      count: item.count,
                    },
                  )}
                />
              </div>

              <span className="text-xs text-tertiary">
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function StatisticsPage() {
  const { t } = useTranslation()

  const {
    data,
    loading,
    error,
    retry,
  } = useViewingHistory()

  const today = localDateString()

  const stats = useMemo(
    () => calculateViewingStats(
      data,
      today,
    ),
    [data, today],
  )

  if (loading) {
    return (
      <main
        className="space-y-4"
        aria-live="polite"
      >
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('statisticsUi.title')}
        </h1>

        <p className="text-secondary">
          {t('statisticsUi.calculating')}
        </p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('statisticsUi.title')}
        </h1>

        <p
          role="alert"
          className="text-secondary"
        >
          {t('statisticsUi.loadError')}
        </p>

        <button
          type="button"
          onClick={retry}
          className="rounded-lg border border-border-strong px-4 py-2 text-sm hover:bg-surface-muted"
        >
          {t('statisticsUi.retry')}
        </button>
      </main>
    )
  }

  return (
    <main className="w-full min-w-0 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('statisticsUi.title')}
        </h1>

        <p className="text-secondary">
          {t('statisticsUi.description')}
        </p>
      </header>

      <section
        aria-label={t(
          'statisticsUi.totalsAria',
        )}
        className="grid gap-4 sm:grid-cols-3"
      >
        <MetricCard
          label={t('statisticsUi.thisMonth')}
          value={stats.thisMonth}
          description={t(
            'statisticsUi.viewingEvents',
          )}
        />

        <MetricCard
          label={t('statisticsUi.thisYear')}
          value={stats.thisYear}
          description={t(
            'statisticsUi.viewingEvents',
          )}
        />

        <MetricCard
          label={t('statisticsUi.allTime')}
          value={stats.totalViewings}
          description={t(
            'statisticsUi.viewingEvents',
          )}
        />
      </section>

      {!stats.totalViewings ? (
        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold">
            {t('statisticsUi.emptyTitle')}
          </h2>

          <p className="mt-2 text-sm text-secondary">
            {t(
              'statisticsUi.emptyDescription',
            )}
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <MediaTypeBreakdown
              mediaTypes={stats.mediaTypes}
            />

            <RankedList
              title={t(
                'statisticsUi.favoriteEras',
              )}
              items={stats.topDecades}
              emptyText={t(
                'statisticsUi.noReleaseYear',
              )}
            />
          </div>

          <ActivityChart
            activity={stats.monthlyActivity}
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <RankedList
              title={t(
                'statisticsUi.topGenres',
              )}
              items={stats.topGenres}
              emptyText={t(
                'statisticsUi.noGenres',
              )}
            />

            <RankedList
              title={t(
                'statisticsUi.topDirectors',
              )}
              items={stats.topDirectors}
              emptyText={t(
                'statisticsUi.noDirectors',
              )}
            />

            <RankedList
              title={t(
                'statisticsUi.topCreators',
              )}
              items={stats.topCreators}
              emptyText={t(
                'statisticsUi.noCreators',
              )}
            />
          </div>
        </>
      )}
    </main>
  )
}
