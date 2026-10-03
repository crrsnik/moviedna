import {
  useEffect,
  useState,
} from 'react'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

import {
  ACHIEVEMENT_CATALOG_BY_ID,
} from '../constants/achievementCatalog.js'

const DEFAULT_VISIBLE = 8

function formatUnlockedDate(date) {
  if (!(date instanceof Date)) return null

  try {
    return new Intl.DateTimeFormat(
      undefined,
      {
        dateStyle: 'medium',
      },
    ).format(date)
  } catch {
    return date.toLocaleDateString()
  }
}

function Medal({
  achievement,
  definition,
  onSelect,
}) {
  const { t } = useTranslation()

  const title = t(definition.titleKey)

  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-label={t(
          'achievementsUi.openAchievement',
          { title },
        )}
        onClick={() => onSelect(achievement)}
        className="group flex w-full flex-col items-center rounded-xl p-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      >
        <img
          src={definition.image}
          alt=""
          aria-hidden="true"
          className={[
            'aspect-square w-full max-w-24 transition duration-200 drop-shadow-lg',
            achievement.unlocked
              ? 'opacity-100'
              : 'grayscale opacity-30',
            'group-hover:scale-105',
          ].join(' ')}
        />

        <span
          className={[
            'mt-2 line-clamp-2 text-xs font-medium sm:text-sm',
            achievement.unlocked
              ? 'text-zinc-100'
              : 'text-zinc-500',
          ].join(' ')}
        >
          {title}
        </span>
      </button>
    </li>
  )
}

function AchievementDialog({
  achievement,
  onClose,
}) {
  const { t } = useTranslation()

  const definition = achievement
    ? ACHIEVEMENT_CATALOG_BY_ID[achievement.id]
    : null

  useEffect(() => {
    if (!achievement) return undefined

    const listener = event => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', listener)

    return () => {
      window.removeEventListener(
        'keydown',
        listener,
      )
    }
  }, [achievement, onClose])

  if (!achievement || !definition) {
    return null
  }

  const title = t(definition.titleKey)

  const unlockedDate = (
    achievement.unlocked
      ? formatUnlockedDate(
        achievement.unlockedAt,
      )
      : null
  )

  return (
    <div
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-dialog-title"
        className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="flex justify-center">
          <div
            aria-hidden="true"
            className={[
              'flex size-28 items-center justify-center rounded-full border-4 border-zinc-700 text-3xl font-black shadow-xl',
              definition.tone,
              achievement.unlocked
                ? ''
                : 'grayscale opacity-35',
            ].join(' ')}
          >
            {definition.symbol}
          </div>
        </div>

        <div className="mt-5 text-center">
          <p
            className={[
              'text-xs font-semibold uppercase tracking-wider',
              achievement.unlocked
                ? 'text-violet-300'
                : 'text-zinc-500',
            ].join(' ')}
          >
            {achievement.unlocked
              ? t('achievementsUi.unlocked')
              : t('achievementsUi.locked')}
          </p>

          <h3
            id="achievement-dialog-title"
            className="mt-2 text-2xl font-semibold"
          >
            {title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {t(definition.descriptionKey)}
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-zinc-950 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-zinc-400">
              {t('achievementsUi.progress')}
            </span>

            <strong>
              {achievement.current}
              {' / '}
              {achievement.target}
            </strong>
          </div>

          <progress
            value={achievement.current}
            max={achievement.target}
            aria-label={t(
              'achievementsUi.progressLabel',
              { title },
            )}
            className="mt-3 h-2 w-full accent-violet-400"
          />

          {unlockedDate && (
            <p className="mt-3 text-xs text-zinc-500">
              {t(
                'achievementsUi.obtained',
                {
                  date: unlockedDate,
                },
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          {t('achievementsUi.close')}
        </button>
      </section>
    </div>
  )
}

export default function AchievementsSection({
  state,
  publicView = false,
}) {
  const { t } = useTranslation()

  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState(null)

  if (state.loading) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-2xl font-semibold">
          {t('achievementsUi.title')}
        </h2>

        <p
          role="status"
          className="mt-4 text-sm text-zinc-400"
        >
          {t('achievementsUi.loading')}
        </p>
      </section>
    )
  }

  if (state.error) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-2xl font-semibold">
          {t('achievementsUi.title')}
        </h2>

        <p
          role="alert"
          className="mt-4 text-sm text-zinc-400"
        >
          {t('achievementsUi.error')}
        </p>
      </section>
    )
  }

  if (!state.data) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-2xl font-semibold">
          {t('achievementsUi.title')}
        </h2>

        <p className="mt-4 text-sm text-zinc-400">
          {t('achievementsUi.preparing')}
        </p>
      </section>
    )
  }

  const achievements = state.data.achievements
    .filter(
      achievement => (
        ACHIEVEMENT_CATALOG_BY_ID[
          achievement.id
        ]
      ),
    )

  const hasMore = (
    achievements.length > DEFAULT_VISIBLE
  )

  const visibleAchievements = expanded
    ? achievements
    : achievements.slice(0, DEFAULT_VISIBLE)

  return (
    <>
      <section
        aria-labelledby="achievements-title"
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              id="achievements-title"
              className="text-2xl font-semibold"
            >
              {t('achievementsUi.title')}
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              {t(
                publicView
                  ? 'achievementsUi.publicDescription'
                  : 'achievementsUi.description',
              )}
            </p>
          </div>

          <div className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-semibold text-zinc-200">
            {t(
              'achievementsUi.summary',
              {
                completed:
                  state.data.completedCount,
                total:
                  state.data.totalCount,
              },
            )}
          </div>
        </div>

        <ul
          id="achievement-medals"
          className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8"
        >
          {visibleAchievements.map(
            achievement => (
              <Medal
                key={achievement.id}
                achievement={achievement}
                definition={
                  ACHIEVEMENT_CATALOG_BY_ID[
                    achievement.id
                  ]
                }
                onSelect={setSelected}
              />
            ),
          )}
        </ul>

        {hasMore && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="achievement-medals"
            onClick={() => setExpanded(
              value => !value,
            )}
            className="mt-5 rounded text-sm font-medium text-violet-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {expanded
              ? t('achievementsUi.showLess')
              : t(
                'achievementsUi.showAll',
                {
                  count: achievements.length,
                },
              )}
          </button>
        )}
      </section>

      <AchievementDialog
        achievement={selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
