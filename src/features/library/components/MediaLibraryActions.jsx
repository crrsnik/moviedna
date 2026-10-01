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

const button = 'rounded-lg border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-50'

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
  const [manage, setManage] =
    useState(false)

  return (
    <section
      aria-label={t(
        'library.actions.navigation',
      )}
      className="space-y-3"
    >
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={button}
          disabled={
            loading
            || Boolean(error)
            || action.pending
            || manage
          }
          aria-pressed={Boolean(
            data?.favorite,
          )}
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
          {data?.favorite
            ? t(
              'library.actions.removeFavorites',
            )
            : t(
              'library.actions.addFavorites',
            )}
        </button>

        <button
          type="button"
          className={button}
          disabled={
            loading
            || Boolean(error)
            || action.pending
            || manage
          }
          aria-pressed={Boolean(
            data?.watchlist,
          )}
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
          {data?.watchlist
            ? t(
              'library.actions.removeWatchlist',
            )
            : t(
              'library.actions.addWatchlist',
            )}
        </button>

        <button
          type="button"
          className={button}
          disabled={
            loading
            || Boolean(error)
            || action.pending
            || manage
          }
          aria-haspopup="dialog"
          onClick={() => setManage(true)}
        >
          {t(
            'library.actions.manageLists',
          )}
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
        <p role="alert">
          {t('library.errors.action')}
        </p>
      )}

      {error && (
        <button
          type="button"
          className={button}
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
