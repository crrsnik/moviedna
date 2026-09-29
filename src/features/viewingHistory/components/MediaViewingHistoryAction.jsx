import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../auth/hooks/useAuth.js'

import {
  detailToViewingSnapshot,
  localDateString,
  validateWatchedDate,
} from '../validation/viewingHistoryValidation.js'

import {
  viewingHistoryService,
} from '../services/viewingHistoryService.js'

const button = 'rounded-lg border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-50'

function AuthenticatedViewingAction({
  uid,
  mediaType,
  detail,
}) {
  const today = localDateString()

  const [watchedDate, setWatchedDate] = useState(today)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  let media

  try {
    media = detailToViewingSnapshot(mediaType, detail)
  } catch {
    return (
      <p role="alert">
        This title cannot be added to viewing history.
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
          ? 'Choose a valid viewing date.'
          : 'Viewing history could not be updated.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      aria-label="Viewing history"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block text-zinc-400">
            Watched on
          </span>

          <input
            type="date"
            value={watchedDate}
            max={today}
            onChange={event => {
              setWatchedDate(event.target.value)
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
          disabled={pending || !watchedDate}
          onClick={addViewing}
        >
          {pending ? 'Adding…' : 'Mark as watched'}
        </button>
      </div>

      {saved && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-zinc-400"
        >
          Added to your viewing history.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-zinc-400">
          {error}
        </p>
      )}
    </section>
  )
}

export default function MediaViewingHistoryAction({
  mediaType,
  detail,
}) {
  const { user } = useAuth()

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Log in to track watched titles
      </Link>
    )
  }

  return (
    <AuthenticatedViewingAction
      key={`${user.uid}:${mediaType}:${detail?.id}`}
      uid={user.uid}
      mediaType={mediaType}
      detail={detail}
    />
  )
}
