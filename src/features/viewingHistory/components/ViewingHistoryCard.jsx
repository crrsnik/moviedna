import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  getTmdbPosterUrl,
} from '../../catalog/services/tmdbImages.js'
import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'
import {
  viewingHistoryService,
} from '../services/viewingHistoryService.js'
import {
  localDateString,
  validateWatchedDate,
} from '../validation/viewingHistoryValidation.js'

const button = (
  'rounded-lg border border-border-strong px-3 py-2 '
  + 'text-sm hover:bg-surface-muted focus-visible:outline-2 '
  + 'focus-visible:outline-offset-4 disabled:cursor-wait '
  + 'disabled:opacity-50'
)

export default function ViewingHistoryCard({
  uid,
  event,
}) {
  const { t } = useTranslation()

  const [watchedDate, setWatchedDate] = useState(
    event.watchedDate,
  )

  const [pending, setPending] = useState(null)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const [
    confirmDelete,
    setConfirmDelete,
  ] = useState(false)

  useEffect(() => {
    setWatchedDate(event.watchedDate)
  }, [event.watchedDate])

  const posterUrl = getTmdbPosterUrl(
    event.posterPath,
  )

  const href = event.mediaType === 'movie'
    ? `/movies/${event.tmdbId}`
    : `/tv/${event.tmdbId}`

  async function saveDate() {
    if (
      pending
      || watchedDate === event.watchedDate
    ) {
      return
    }

    try {
      validateWatchedDate(watchedDate)

      setPending('date')
      setError(null)
      setMessage(null)

      await viewingHistoryService
        .updateViewingDate(
          uid,
          event.eventId,
          watchedDate,
        )

      setMessage(
        'viewingHistoryUi.dateUpdated',
      )
    } catch (failure) {
      setError(
        failure?.code === 'invalid-date'
          ? 'viewingHistoryUi.invalidDate'
          : 'viewingHistoryUi.dateUpdateError',
      )
    } finally {
      setPending(null)
    }
  }

  async function removeViewing() {
    if (pending) return

    try {
      setPending('delete')
      setError(null)
      setMessage(null)

      await viewingHistoryService
        .deleteViewing(
          uid,
          event.eventId,
        )
    } catch {
      setError(
        'viewingHistoryUi.deleteError',
      )
      setPending(null)
      setConfirmDelete(false)
    }
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex gap-4">
        <Link
          to={href}
          className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <div className="flex h-30 w-20 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={t(
                  'viewingHistoryUi.posterAlt',
                  { title: event.title },
                )}
                width="92"
                height="138"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-2 text-center text-xs text-tertiary">
                {t(
                  'viewingHistoryUi.noPoster',
                )}
              </span>
            )}
          </div>
        </Link>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-tertiary">
              {event.mediaType === 'movie'
                ? t(
                  'viewingHistoryUi.movie',
                )
                : t(
                  'viewingHistoryUi.tvShow',
                )}

              {event.releaseYear
                ? ` · ${event.releaseYear}`
                : ''}
            </p>

            <Link
              to={href}
              className="mt-1 inline-block rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {event.title}
            </Link>

            {!!event.genres.length && (
              <p className="mt-1 text-sm text-secondary">
                {event.genres
                  .slice(0, 3)
                  .map(genre => genre.name)
                  .join(' · ')}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-sm">
              <span className="block text-tertiary">
                {t(
                  'viewingHistoryUi.watchedOn',
                )}
              </span>

              <input
                type="date"
                value={watchedDate}
                max={localDateString()}
                disabled={Boolean(pending)}
                onChange={eventValue => {
                  setWatchedDate(
                    eventValue.target.value,
                  )
                  setMessage(null)
                  setError(null)
                }}
                className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-4"
              />
            </label>

            <button
              type="button"
              className={button}
              disabled={
                Boolean(pending)
                || watchedDate
                  === event.watchedDate
              }
              onClick={saveDate}
            >
              {pending === 'date'
                ? t(
                  'viewingHistoryUi.saving',
                )
                : t(
                  'viewingHistoryUi.saveDate',
                )}
            </button>
          </div>

          {!confirmDelete ? (
            <button
              type="button"
              className="rounded text-sm text-secondary underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4"
              disabled={Boolean(pending)}
              onClick={() => {
                setConfirmDelete(true)
                setMessage(null)
              }}
            >
              {t(
                'viewingHistoryUi.deleteViewing',
              )}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-secondary">
                {t(
                  'viewingHistoryUi.deleteQuestion',
                )}
              </span>

              <button
                type="button"
                className={button}
                disabled={Boolean(pending)}
                onClick={removeViewing}
              >
                {pending === 'delete'
                  ? t(
                    'viewingHistoryUi.deleting',
                  )
                  : t(
                    'viewingHistoryUi.delete',
                  )}
              </button>

              <button
                type="button"
                className={button}
                disabled={Boolean(pending)}
                onClick={() => (
                  setConfirmDelete(false)
                )}
              >
                {t(
                  'viewingHistoryUi.cancel',
                )}
              </button>
            </div>
          )}

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-secondary"
            >
              {t(message)}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="text-sm text-secondary"
            >
              {t(error)}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
