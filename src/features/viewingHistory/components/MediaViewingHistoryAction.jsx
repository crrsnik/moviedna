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

const button = (
  'rounded-lg border border-zinc-600 px-4 py-2 '
  + 'text-sm hover:bg-zinc-800 focus-visible:outline-2 '
  + 'focus-visible:outline-offset-4 disabled:cursor-wait '
  + 'disabled:opacity-50'
)

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
        <label className="space-y-1 text-sm">
          <span className="block text-zinc-400">
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
            className="rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4"
          />
        </label>

        <button
          type="button"
          className={button}
          disabled={
            pending || !watchedDate
          }
          onClick={addViewing}
        >
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
          className="text-sm text-zinc-400"
        >
          {t('viewingHistoryUi.added')}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="text-sm text-zinc-400"
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
