import { useState } from 'react'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'
import {
  sortDnaEntriesForDisplay,
} from '../utils/sortDnaEntriesForDisplay.js'

const DEFAULT_VISIBLE = 4

function compatibilityKey(score) {
  if (score >= 0.35) {
    return 'dnaUi.compatibility.strong'
  }

  if (score > 0.05) {
    return 'dnaUi.compatibility.positive'
  }

  if (score <= -0.2) {
    return 'dnaUi.compatibility.lower'
  }

  return 'dnaUi.compatibility.neutral'
}

export default function DnaDimensionSection({
  id,
  title,
  entries = [],
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const orderedEntries = (
    sortDnaEntriesForDisplay(entries)
  )

  const hasMore = (
    orderedEntries.length > DEFAULT_VISIBLE
  )

  const visibleEntries = expanded
    ? orderedEntries
    : orderedEntries.slice(
      0,
      DEFAULT_VISIBLE,
    )

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
    >
      <h2
        id={`${id}-title`}
        className="text-xl font-semibold"
      >
        {title}
      </h2>

      {orderedEntries.length ? (
        <>
          <ul
            id={`${id}-entries`}
            className="mt-4 space-y-3"
          >
            {visibleEntries.map(entry => {
              const percent = Math.round(
                Math.abs(entry.score) * 100,
              )

              return (
                <li
                  key={entry.key}
                  className="rounded-xl bg-zinc-950 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="break-words">
                      {entry.label}
                    </strong>

                    <span className="text-sm text-zinc-300">
                      {t(
                        compatibilityKey(
                          entry.score,
                        ),
                      )}
                      {' · '}
                      {entry.score >= 0 ? '+' : '−'}
                      {percent}%
                    </span>
                  </div>

                  <progress
                    aria-label={t(
                      'dnaUi.compatibility.strength',
                      { label: entry.label },
                    )}
                    value={percent}
                    max="100"
                    className="mt-3 h-2 w-full accent-violet-400"
                  />
                </li>
              )
            })}
          </ul>

          {hasMore && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`${id}-entries`}
              onClick={() => setExpanded(
                value => !value,
              )}
              className="mt-4 rounded text-sm font-medium text-violet-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {expanded
                ? t('dnaUi.showLess')
                : t(
                  'dnaUi.showAll',
                  {
                    count:
                      orderedEntries.length,
                  },
                )}
            </button>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">
          {t('dnaUi.notEnoughEvidence')}
        </p>
      )}
    </section>
  )
}
