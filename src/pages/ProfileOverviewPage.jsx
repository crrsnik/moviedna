import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useMovieDna } from '../features/dna/hooks/useMovieDna.js'
import { selectDnaPreviewTraits } from '../features/dna/utils/selectDnaPreviewTraits.js'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'
import { calculateViewingStats } from '../features/statistics/core/calculateViewingStats.js'
import { useViewingHistory } from '../features/viewingHistory/hooks/useViewingHistory.js'
import { localDateString } from '../features/viewingHistory/validation/viewingHistoryValidation.js'

const CATEGORY_KEYS = Object.freeze({
  genres:
    'profile.overviewPage.categories.genres',
  mediaTypes:
    'profile.overviewPage.categories.mediaTypes',
  decades:
    'profile.overviewPage.categories.decades',
  countries:
    'profile.overviewPage.categories.countries',
  directors:
    'profile.overviewPage.categories.directors',
  actors:
    'profile.overviewPage.categories.actors',
})

function DnaPreview({ state }) {
  const { t } = useTranslation()

  if (!state.current) {
    return (
      <p className="text-sm text-zinc-400">
        {state.kind === 'failed'
          ? t(
            'profile.overviewPage.dnaFailed',
          )
          : t(
            'profile.overviewPage.dnaPreparing',
          )}
      </p>
    )
  }

  const traits = selectDnaPreviewTraits(
    state.current.dimensions,
  )

  if (!traits.length) {
    return (
      <p className="text-sm text-zinc-400">
        {t(
          'profile.overviewPage.dnaEmpty',
        )}
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {traits.map(trait => {
        const percent = Math.round(
          trait.score * 100,
        )

        return (
          <article
            key={`${trait.dimension}:${trait.key}`}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <p className="text-xs font-medium text-zinc-500">
              {t(
                CATEGORY_KEYS[
                  trait.dimension
                ],
              )}
            </p>

            <div className="mt-1 flex items-baseline justify-between gap-3">
              <h3 className="font-semibold">
                {trait.label}
              </h3>

              <span className="text-sm font-medium text-zinc-300">
                +{percent}%
              </span>
            </div>

            <progress
              aria-label={t(
                'profile.overviewPage.dnaCompatibility',
                {
                  label: trait.label,
                },
              )}
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
  const { t } = useTranslation()
  const dnaState = useMovieDna()
  const history = useViewingHistory()
  const today = localDateString()

  const stats = useMemo(
    () => calculateViewingStats(
      Array.isArray(history.data)
        ? history.data
        : [],
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
              {t(
                'profile.overviewPage.dnaTitle',
              )}
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              {t(
                'profile.overviewPage.dnaDescription',
              )}
            </p>
          </div>

          <Link
            to="/profile/dna"
            className="rounded-md text-sm font-medium text-zinc-200 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t(
              'profile.overviewPage.viewDna',
            )}
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
              {t(
                'profile.overviewPage.activityTitle',
              )}
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              {t(
                'profile.overviewPage.activityDescription',
              )}
            </p>
          </div>

          <Link
            to="/profile/stats"
            className="rounded-md text-sm font-medium text-zinc-200 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t(
              'profile.overviewPage.viewStatistics',
            )}
          </Link>
        </div>

        {history.loading ? (
          <p
            role="status"
            className="mt-5 text-sm text-zinc-400"
          >
            {t(
              'profile.overviewPage.activityLoading',
            )}
          </p>
        ) : history.error ? (
          <p
            role="alert"
            className="mt-5 text-sm text-zinc-400"
          >
            {t(
              'profile.overviewPage.activityError',
            )}
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={t(
                'profile.overviewPage.allTime',
              )}
              value={stats.totalViewings}
            />

            <Stat
              label={t(
                'profile.overviewPage.thisMonth',
              )}
              value={stats.thisMonth}
            />

            <Stat
              label={t(
                'profile.overviewPage.movies',
              )}
              value={
                stats.mediaTypes.movieCount
              }
            />

            <Stat
              label={t(
                'profile.overviewPage.tvShows',
              )}
              value={
                stats.mediaTypes.tvCount
              }
            />
          </div>
        )}
      </section>
    </div>
  )
}
