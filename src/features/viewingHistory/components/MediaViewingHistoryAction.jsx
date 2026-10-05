import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../auth/hooks/useAuth.js'
import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'
import {
  viewingHistoryService,
} from '../services/viewingHistoryService.js'
import {
  detailToViewingSnapshot,
  localDateString,
  validateWatchedDate,
} from '../validation/viewingHistoryValidation.js'

function isFutureMovie({
  mediaType,
  detail,
}) {
  if (
    mediaType !== 'movie'
    || typeof detail?.releaseDate
      !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(
      detail.releaseDate,
    )
  ) {
    return false
  }

  return (
    detail.releaseDate
    > localDateString()
  )
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  )
}

function AuthenticatedViewingAction({
  uid,
  mediaType,
  detail,
}) {
  const { t } = useTranslation()
  const today = localDateString()

  const [watchedDate, setWatchedDate] = (
    useState(today)
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  let media

  try {
    media = detailToViewingSnapshot(
      mediaType,
      detail,
    )
  } catch {
    return (
      <p role="alert">
        {t('viewingHistoryUi.cannotAdd')}
      </p>
    )
  }

  async function addViewing() {
    if (pending) return

    try {
      validateWatchedDate(watchedDate)

      setPending(true)
      setError(null)
      setSaved(false)

      await viewingHistoryService.addViewing(
        uid,
        media,
        watchedDate,
      )

      setSaved(true)
    } catch (failure) {
      setError(
        failure?.code === 'invalid-date'
          ? 'viewingHistoryUi.invalidDate'
          : 'viewingHistoryUi.updateError',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      aria-label={t(
        'viewingHistoryUi.sectionAria',
      )}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="order-last text-sm">
          <span className="sr-only">
            {t('viewingHistoryUi.watchedOn')}
          </span>

          <input
            type="date"
            value={watchedDate}
            max={today}
            onChange={event => {
              setWatchedDate(
                event.target.value,
              )

              setSaved(false)
              setError(null)
            }}
            disabled={pending}
            className="
              rounded-lg border border-border bg-surface
              px-3 py-2 text-sm text-primary
              focus-visible:outline-2
              focus-visible:outline-offset-2
              focus-visible:outline-focus
            "
          />
        </label>

        <button
          type="button"
          disabled={
            pending || !watchedDate
          }
          onClick={addViewing}
          className="
            ui-pressable order-first inline-flex cursor-pointer items-center gap-2
            rounded-full bg-primary px-4 py-2
            text-sm font-semibold text-app
            transition-opacity hover:opacity-85
            focus-visible:outline-2
            focus-visible:outline-offset-2
            focus-visible:outline-focus
            disabled:cursor-wait disabled:opacity-50
          "
        >
          <CheckIcon />

          {pending
            ? t('viewingHistoryUi.adding')
            : t(
              'viewingHistoryUi.markWatched',
            )}
        </button>
      </div>

      {saved && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-secondary"
        >
          {t('viewingHistoryUi.added')}
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
    </section>
  )
}

export default function MediaViewingHistoryAction({
  mediaType,
  detail,
}) {
  const { t } = useTranslation()
  const { user } = useAuth()

  if (
    isFutureMovie({
      mediaType,
      detail,
    })
  ) {
    return null
  }

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {t(
          'viewingHistoryUi.loginToTrack',
        )}
      </Link>
    )
  }

  return (
    <AuthenticatedViewingAction
      key={
        `${user.uid}:${mediaType}:${detail?.id}`
      }
      uid={user.uid}
      mediaType={mediaType}
      detail={detail}
    />
  )
}
