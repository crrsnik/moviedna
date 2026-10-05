import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

import {
  PROFILE_AVATARS,
} from '../../profile/constants/profileSettings.js'

import {
  getPublicProfileByUserId,
} from '../../profile/services/publicProfileService.js'

import {
  useNotifications,
} from '../hooks/useNotifications.js'

const PREVIEW_LIMIT = 5

function notificationTarget(notification) {
  if (
    notification.type === 'friend_request'
    || notification.type === 'friend_accepted'
  ) {
    return '/friends'
  }

  if (notification.type === 'achievement_unlocked') {
    return '/profile'
  }

  return '/'
}

function actorAvatar(profile) {
  if (!profile) return '👤'

  return (
    PROFILE_AVATARS.find(
      avatar => avatar.id === profile.avatarId,
    )?.symbol
    ?? '👤'
  )
}

function actorName(profile, fallback) {
  return (
    profile?.displayName
    || profile?.username
    || fallback
  )
}

function notificationText(
  notification,
  profile,
  t,
) {
  const name = actorName(
    profile,
    t('notifications.unknownUser'),
  )

  if (notification.type === 'friend_request') {
    return t(
      'notifications.friendRequest',
      { name },
    )
  }

  if (notification.type === 'friend_accepted') {
    return t(
      'notifications.friendAccepted',
      { name },
    )
  }

  if (notification.type === 'achievement_unlocked') {
    return t(
      'notifications.achievementUnlocked',
    )
  }

  return t('notifications.fallback')
}

function timestampLabel(timestamp) {
  try {
    const date = typeof timestamp?.toDate === 'function'
      ? timestamp.toDate()
      : null

    if (!date) return ''

    return new Intl.DateTimeFormat(
      undefined,
      {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    ).format(date)
  } catch {
    return ''
  }
}

export default function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] =
    useState(false)
  const [actionError, setActionError] =
    useState(false)
  const [profileRevision, setProfileRevision] =
    useState(0)

  const containerRef = useRef(null)
  const actorProfilesRef = useRef(new Map())

  const visibleNotifications =
    notifications.slice(0, PREVIEW_LIMIT)

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (
        containerRef.current
        && !containerRef.current.contains(
          event.target,
        )
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener(
      'pointerdown',
      handlePointerDown,
    )

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown,
      )

      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [open])

  useEffect(() => {
    let active = true

    const actorIds = [
      ...new Set(
        notifications
          .map(notification => notification.actorUid)
          .filter(Boolean),
      ),
    ]

    const missing = actorIds.filter(
      uid => !actorProfilesRef.current.has(uid),
    )

    if (!missing.length) {
      return undefined
    }

    Promise.all(
      missing.map(async uid => {
        try {
          const profile =
            await getPublicProfileByUserId(uid)

          return [uid, profile]
        } catch {
          return [uid, null]
        }
      }),
    ).then((entries) => {
      if (!active) return

      for (const [uid, profile] of entries) {
        actorProfilesRef.current.set(
          uid,
          profile,
        )
      }

      setProfileRevision(
        revision => revision + 1,
      )
    })

    return () => {
      active = false
    }
  }, [notifications])

  async function handleMarkAllRead() {
    if (markingAll || unreadCount === 0) {
      return
    }

    setMarkingAll(true)
    setActionError(false)

    try {
      await markAllAsRead()
    } catch {
      setActionError(true)
    } finally {
      setMarkingAll(false)
    }
  }

  function openNotification(notification) {
    setActionError(false)

    if (notification.readAt === null) {
      markAsRead(notification.id)
        .catch(() => {
          setActionError(true)
        })
    }

    setOpen(false)

    navigate(
      notificationTarget(notification),
    )
  }

  void profileRevision

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t(
          'notifications.ariaLabel',
          {
            count: unreadCount,
          },
        )}
        onClick={() => {
          setOpen(value => !value)
          setActionError(false)
        }}
        className="relative flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-muted text-primary hover:border-border-strong hover:bg-surface-muted hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
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
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold leading-5 text-white"
          >
            {unreadCount > 50
              ? '50+'
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t(
            'notifications.title',
          )}
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-white">
                {t('notifications.title')}
              </p>

              {unreadCount > 0 && (
                <p className="mt-0.5 text-xs text-secondary">
                  {t(
                    'notifications.unreadCount',
                    {
                      count: unreadCount,
                    },
                  )}
                </p>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markingAll}
                onClick={handleMarkAllRead}
                className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-violet-300 hover:bg-surface-muted hover:text-violet-200 disabled:cursor-wait disabled:opacity-60"
              >
                {markingAll
                  ? t(
                      'notifications.markingAllRead',
                    )
                  : t(
                      'notifications.markAllRead',
                    )}
              </button>
            )}
          </div>

          {loading ? (
            <p
              role="status"
              className="px-4 py-8 text-center text-sm text-secondary"
            >
              {t('notifications.loading')}
            </p>
          ) : error ? (
            <p
              role="alert"
              className="px-4 py-8 text-center text-sm text-red-300"
            >
              {t('notifications.unavailable')}
            </p>
          ) : visibleNotifications.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <div
                aria-hidden="true"
                className="mb-2 text-2xl"
              >
                🔔
              </div>

              <p className="text-sm text-secondary">
                {t('notifications.empty')}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {visibleNotifications.map(
                notification => {
                  const profile =
                    notification.actorUid
                      ? actorProfilesRef.current.get(
                          notification.actorUid,
                        )
                      : null

                  const unread =
                    notification.readAt === null

                  const dateLabel =
                    timestampLabel(
                      notification.createdAt,
                    )

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        openNotification(
                          notification,
                        )
                      }}
                      className={
                        'relative flex w-full cursor-pointer gap-3 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-muted/80 '
                        + (
                          unread
                            ? 'bg-violet-500/5'
                            : 'bg-transparent'
                        )
                      }
                    >
                      {unread && (
                        <span
                          aria-hidden="true"
                          className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-violet-400"
                        />
                      )}

                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-base"
                      >
                        {notification.type
                          === 'achievement_unlocked'
                          ? '🏆'
                          : actorAvatar(profile)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={
                            'block text-sm leading-5 '
                            + (
                              unread
                                ? 'font-medium text-primary'
                                : 'text-secondary'
                            )
                          }
                        >
                          {notificationText(
                            notification,
                            profile,
                            t,
                          )}
                        </span>

                        {dateLabel && (
                          <span className="mt-1 block text-xs text-tertiary">
                            {dateLabel}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                },
              )}
            </div>
          )}

          {actionError && (
            <p
              role="alert"
              className="border-t border-border px-4 py-2 text-xs text-red-300"
            >
              {t(
                'notifications.actionError',
              )}
            </p>
          )}

          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/notifications')
              }}
              className="w-full cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-medium text-secondary hover:bg-surface-muted hover:text-white focus-visible:outline-2 focus-visible:outline-focus"
            >
              {t('notifications.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
