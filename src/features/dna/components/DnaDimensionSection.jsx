import { useState } from 'react'

const DEFAULT_VISIBLE = 4

function compatibility(score) {
  if (score >= 0.35) return 'Strong match'
  if (score > 0.05) return 'Positive match'
  if (score <= -0.2) return 'Lower compatibility'
  return 'Neutral or mixed'
}

function strongestFirst(entries) {
  return [...entries].sort((left, right) => {
    const strength = Math.abs(right.score) - Math.abs(left.score)
    if (strength !== 0) return strength

    const score = right.score - left.score
    if (score !== 0) return score

    return left.label.localeCompare(right.label)
  })
}

export default function DnaDimensionSection({
  id,
  title,
  entries = [],
}) {
  const [expanded, setExpanded] = useState(false)
  const orderedEntries = strongestFirst(entries)
  const hasMore = orderedEntries.length > DEFAULT_VISIBLE
  const visibleEntries = expanded
    ? orderedEntries
    : orderedEntries.slice(0, DEFAULT_VISIBLE)

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
              const description = compatibility(entry.score)

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
                      {description}
                      {' · '}
                      {entry.score >= 0 ? '+' : '−'}
                      {percent}%
                    </span>
                  </div>

                  <progress
                    aria-label={`${entry.label} compatibility strength`}
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
              onClick={() => setExpanded(value => !value)}
              className="mt-4 rounded text-sm font-medium text-violet-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {expanded ? 'Show less' : 'Show all'}
            </button>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">
          Not enough evidence yet.
        </p>
      )}
    </section>
  )
}
