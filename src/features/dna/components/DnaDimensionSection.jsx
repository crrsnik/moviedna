import { useState } from 'react'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'
import {
  sortDnaEntriesForDisplay,
} from '../utils/sortDnaEntriesForDisplay.js'

import {
  resolveDimensionLabel,
} from '../services/dimensionLabels.js'
import DnaTraitBar from './DnaTraitBar.jsx'

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
  const { t, locale } = useTranslation()
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
      className="rounded-2xl border border-border bg-surface p-5"
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

              const label =
                resolveDimensionLabel(
                  id,
                  entry,
                  locale,
                )

              return (
                <li
                  key={entry.key}
                  className="rounded-xl bg-surface-muted p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="break-words">
                      {label}
                    </strong>

                    <span className="text-sm text-secondary">
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

                  <DnaTraitBar
                    dimension={id}
                    traitKey={entry.key}
                    label={label}
                    percent={percent}
                    negative={entry.score < 0}
                    ariaLabel={t(
                      'dnaUi.compatibility.strength',
                      { label },
                    )}
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
              className="mt-4 rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
        <p className="mt-3 text-sm text-secondary">
          {t('dnaUi.notEnoughEvidence')}
        </p>
      )}
    </section>
  )
}
