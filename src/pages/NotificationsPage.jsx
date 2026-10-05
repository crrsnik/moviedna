import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  ACHIEVEMENT_CATALOG_BY_ID,
} from '../features/achievements/constants/achievementCatalog.js'

import {
  useTranslation,
} from '../features/localization/hooks/useTranslation.js'

import {
  useNotificationHistory,
} from '../features/notifications/hooks/useNotificationHistory.js'

import {
  PROFILE_AVATARS,
} from '../features/profile/constants/profileSettings.js'

import {
  getPublicProfileByUserId,
} from '../features/profile/services/publicProfileService.js'

function targetFor(notification) {
  if (
    notification.type === 'friend_request'
    || notification.type === 'friend_accepted'
  ) {
    return '/friends'
  }

  if (
    notification.type
    === 'achievement_unlocked'
  ) {
    return '/profile'
  }

  return '/'
}

function avatarFor(profile) {
  if (!profile) return '👤'

  return (
    PROFILE_AVATARS.find(
      avatar => avatar.id
        === profile.avatarId,
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

function formatDate(timestamp) {
  try {
    const date =
      timestamp instanceof Date
        ? timestamp
        : typeof timestamp?.toDate
            === 'function'
          ? timestamp.toDate()
          : null

    if (!date) return ''

    return new Intl.DateTimeFormat(
      undefined,
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    ).format(date)
  } catch {
    return ''
  }
}

function notificationCopy(
  notification,
  profile,
  t,
) {
  const name = actorName(
    profile,
    t('notifications.unknownUser'),
  )

  if (
    notification.type
    === 'friend_request'
  ) {
    return t(
      'notifications.friendRequest',
      { name },
    )
  }

  if (
    notification.type
    === 'friend_accepted'
  ) {
    return t(
      'notifications.friendAccepted',
      { name },
    )
  }

  if (
    notification.type
    === 'achievement_unlocked'
  ) {
    const definition =
      ACHIEVEMENT_CATALOG_BY_ID[
        notification.entityId
      ]

    const title = definition
      ? t(definition.titleKey)
      : t(
          'notifications.unknownAchievement',
        )

    return t(
      'notifications.achievementUnlockedNamed',
      { title },
    )
  }

  return t('notifications.fallback')
}

function NotificationIcon({
  notification,
  profile,
}) {
  if (
    notification.type
    === 'achievement_unlocked'
  ) {
    const definition =
      ACHIEVEMENT_CATALOG_BY_ID[
        notification.entityId
      ]

    if (definition) {
      return (
        <img
          src={definition.image}
          alt=""
          aria-hidden="true"
          className="size-11"
        />
      )
    }

    return (
      <span
        aria-hidden="true"
        className="text-xl"
      >
        🏆
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className="text-xl"
    >
      {avatarFor(profile)}
    </span>
  )
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const {
    notifications,
    loading,
    loadingMore,
    hasMore,
    error,
    actionError,
    busyId,
    markingAll,
    loadMore,
    markAsRead,
    markAsUnread,
    markAllAsRead,
  } = useNotificationHistory()

  const profilesRef = useRef(new Map())

  const [
    profileRevision,
    setProfileRevision,
  ] = useState(0)

  useEffect(() => {
    let active = true

    const actorIds = [
      ...new Set(
        notifications
          .map(
            notification =>
              notification.actorUid,
          )
          .filter(Boolean),
      ),
    ]

    const missing = actorIds.filter(
      uid => !profilesRef.current.has(uid),
    )

    if (!missing.length) {
      return undefined
    }

    Promise.all(
      missing.map(async uid => {
        try {
          return [
            uid,
            await getPublicProfileByUserId(
              uid,
            ),
          ]
        } catch {
          return [uid, null]
        }
      }),
    ).then((entries) => {
      if (!active) return

      for (
        const [uid, profile]
        of entries
      ) {
        profilesRef.current.set(
          uid,
          profile,
        )
      }

      setProfileRevision(
        value => value + 1,
      )
    })

    return () => {
      active = false
    }
  }, [notifications])

  function openNotification(
    notification,
  ) {
    if (notification.readAt === null) {
      markAsRead(notification.id)
    }

    navigate(targetFor(notification))
  }

  void profileRevision

  if (loading) {
    return (
      <div className="w-full self-start">
        <p
          role="status"
          className="text-secondary"
        >
          {t('notifications.loading')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <section className="w-full self-start rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold">
          {t(
            'notifications.unavailableTitle',
          )}
        </h1>

        <p
          role="alert"
          className="mt-2 text-secondary"
        >
          {t(
            'notifications.unavailable',
          )}
        </p>
      </section>
    )
  }

  return (
    <section
      className="w-full min-w-0 self-start space-y-6"
      aria-labelledby="notifications-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1
            id="notifications-title"
            className="text-3xl font-semibold tracking-tight"
          >
            {t('notifications.title')}
          </h1>

          <p className="max-w-2xl text-sm text-secondary">
            {t(
              'notifications.description',
            )}
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={markAllAsRead}
            className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium text-primary transition hover:bg-surface-muted disabled:cursor-wait disabled:opacity-50"
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

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300"
        >
          {t(
            'notifications.actionError',
          )}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {notifications.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div
              aria-hidden="true"
              className="text-3xl"
            >
              🔔
            </div>

            <p className="mt-3 text-sm text-secondary">
              {t(
                'notifications.historyEmpty',
              )}
            </p>
          </div>
        ) : (
          <div>
            {notifications.map(
              notification => {
                const profile =
                  notification.actorUid
                    ? profilesRef.current.get(
                        notification.actorUid,
                      )
                    : null

                const unread =
                  notification.readAt === null

                const busy =
                  busyId === notification.id

                return (
                  <article
                    key={notification.id}
                    className={
                      'flex items-stretch border-b border-border last:border-b-0 '
                      + (
                        unread
                          ? 'bg-violet-500/5'
                          : 'bg-transparent'
                      )
                    }
                  >
                    <button
                      type="button"
                      onClick={() => {
                        openNotification(
                          notification,
                        )
                      }}
                      className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-4 px-4 py-4 text-left transition hover:bg-surface-muted/70 sm:px-5"
                    >
                      {unread && (
                        <span
                          aria-hidden="true"
                          className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-violet-400"
                        />
                      )}

                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted">
                        <NotificationIcon
                          notification={
                            notification
                          }
                          profile={profile}
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={
                            'block text-sm leading-6 sm:text-base '
                            + (
                              unread
                                ? 'font-medium text-primary'
                                : 'text-secondary'
                            )
                          }
                        >
                          {notificationCopy(
                            notification,
                            profile,
                            t,
                          )}
                        </span>

                        <span className="mt-1 block text-xs text-tertiary">
                          {formatDate(
                            notification.createdAt,
                          )}
                        </span>
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center border-l border-border px-2 sm:px-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => (
                          unread
                            ? markAsRead(
                                notification.id,
                              )
                            : markAsUnread(
                                notification.id,
                              )
                        )}
                        className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-secondary hover:bg-surface-muted hover:text-primary disabled:cursor-wait disabled:opacity-50 sm:px-3"
                      >
                        {unread
                          ? t(
                              'notifications.markRead',
                            )
                          : t(
                              'notifications.markUnread',
                            )}
                      </button>
                    </div>
                  </article>
                )
              },
            )}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="cursor-pointer rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-surface-muted disabled:cursor-wait disabled:opacity-50"
          >
            {loadingMore
              ? t(
                  'notifications.loadingMore',
                )
              : t(
                  'notifications.loadMore',
                )}
          </button>
        </div>
      )}
    </section>
  )
}
