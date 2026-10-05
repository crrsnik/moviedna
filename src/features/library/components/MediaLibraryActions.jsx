import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../auth/hooks/useAuth.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

import ManageListsPanel from './ManageListsPanel.jsx'
import { useSavedMediaStatus } from '../hooks/useSavedMediaStatus.js'
import { useLibraryAction } from '../hooks/useLibraryAction.js'

import {
  detailToSnapshot,
  getMediaKey,
} from '../validation/libraryValidation.js'

import { mediaLibraryService } from '../services/mediaLibraryService.js'

const iconButtonBase = (
  'inline-flex size-10 cursor-pointer items-center justify-center '
  + 'rounded-full border transition-colors '
  + 'focus-visible:outline-2 focus-visible:outline-offset-2 '
  + 'focus-visible:outline-focus disabled:cursor-wait '
  + 'disabled:opacity-50'
)

const secondaryButton = (
  'rounded-lg border border-border-strong bg-surface px-4 py-2 '
  + 'text-sm font-medium text-primary transition-colors '
  + 'hover:bg-surface-muted focus-visible:outline-2 '
  + 'focus-visible:outline-offset-2 focus-visible:outline-focus'
)

function actionButtonClass(active = false) {
  return [
    iconButtonBase,
    active
      ? 'border-primary bg-primary text-app'
      : (
        'border-border-strong bg-surface text-primary '
        + 'hover:bg-surface-muted'
      ),
  ].join(' ')
}

function HeartIcon({ filled = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function BookmarkIcon({ filled = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />
    </svg>
  )
}

function AuthenticatedActions({
  uid,
  media,
}) {
  const { t } = useTranslation()

  const {
    data,
    loading,
    error,
    retry,
  } = useSavedMediaStatus(
    uid,
    media,
  )

  const action = useLibraryAction()
  const [manage, setManage] = useState(false)

  const favoriteLabel = data?.favorite
    ? t('library.actions.removeFavorites')
    : t('library.actions.addFavorites')

  const watchlistLabel = data?.watchlist
    ? t('library.actions.removeWatchlist')
    : t('library.actions.addWatchlist')

  const manageLabel = t(
    'library.actions.manageLists',
  )

  const disabled = (
    loading
    || Boolean(error)
    || action.pending
    || manage
  )

  return (
    <section
      aria-label={t(
        'library.actions.navigation',
      )}
      className="space-y-3"
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={actionButtonClass(
            Boolean(data?.favorite),
          )}
          disabled={disabled}
          aria-pressed={Boolean(
            data?.favorite,
          )}
          aria-label={favoriteLabel}
          title={favoriteLabel}
          onClick={() => (
            action.run(() => (
              mediaLibraryService
                .toggleFavorite({
                  uid,
                  media,
                })
            ))
          )}
        >
          <HeartIcon
            filled={Boolean(data?.favorite)}
          />
        </button>

        <button
          type="button"
          className={actionButtonClass(
            Boolean(data?.watchlist),
          )}
          disabled={disabled}
          aria-pressed={Boolean(
            data?.watchlist,
          )}
          aria-label={watchlistLabel}
          title={watchlistLabel}
          onClick={() => (
            action.run(() => (
              mediaLibraryService
                .toggleWatchlist({
                  uid,
                  media,
                })
            ))
          )}
        >
          <ClockIcon />
        </button>

        <button
          type="button"
          className={actionButtonClass(false)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-label={manageLabel}
          title={manageLabel}
          onClick={() => setManage(true)}
        >
          <BookmarkIcon
            filled={Boolean(data?.listIds?.length)}
          />
        </button>
      </div>

      {manage && (
        <ManageListsPanel
          uid={uid}
          media={media}
          listIds={data?.listIds ?? []}
          onClose={() => (
            setManage(false)
          )}
        />
      )}

      {(loading || action.pending) && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-secondary"
        >
          {action.pending
            ? t(
              'library.actions.saving',
            )
            : t(
              'library.actions.loadingStatus',
            )}
        </p>
      )}

      {(error || action.error) && (
        <p
          role="alert"
          className="text-sm text-secondary"
        >
          {t('library.errors.action')}
        </p>
      )}

      {error && (
        <button
          type="button"
          className={secondaryButton}
          onClick={retry}
        >
          {t(
            'library.actions.retryStatus',
          )}
        </button>
      )}
    </section>
  )
}

export default function MediaLibraryActions({
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
          'library.actions.loginToSave',
        )}
      </Link>
    )
  }

  let media

  try {
    media = detailToSnapshot(
      mediaType,
      detail,
    )
  } catch {
    return (
      <p role="alert">
        {t(
          'library.actions.cannotSave',
        )}
      </p>
    )
  }

  return (
    <AuthenticatedActions
      key={`${user.uid}:${getMediaKey(
        mediaType,
        media.tmdbId,
      )}`}
      uid={user.uid}
      media={media}
    />
  )
}
