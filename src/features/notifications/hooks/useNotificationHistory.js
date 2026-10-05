import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  useAuth,
} from '../../auth/hooks/useAuth.js'

import {
  notificationService,
} from '../services/notificationService.js'

const PAGE_SIZE = 25
const EMPTY_NOTIFICATIONS = Object.freeze([])

function mergeNotifications(current, incoming) {
  return [
    ...new Map(
      [...current, ...incoming].map(
        notification => [
          notification.id,
          notification,
        ],
      ),
    ).values(),
  ]
}

export function useNotificationHistory() {
  const { user } = useAuth()
  const userId = user?.uid ?? null

  const [state, setState] = useState({
    userId: null,
    loading: false,
    loadingMore: false,
    notifications: EMPTY_NOTIFICATIONS,
    cursor: null,
    hasMore: false,
    error: null,
    actionError: null,
    busyId: null,
    markingAll: false,
  })

  useEffect(() => {
    if (!userId) {
      setState({
        userId: null,
        loading: false,
        loadingMore: false,
        notifications: EMPTY_NOTIFICATIONS,
        cursor: null,
        hasMore: false,
        error: null,
        actionError: null,
        busyId: null,
        markingAll: false,
      })

      return undefined
    }

    let active = true

    setState({
      userId,
      loading: true,
      loadingMore: false,
      notifications: EMPTY_NOTIFICATIONS,
      cursor: null,
      hasMore: false,
      error: null,
      actionError: null,
      busyId: null,
      markingAll: false,
    })

    notificationService
      .loadNotificationsPage({
        pageSize: PAGE_SIZE,
      })
      .then((result) => {
        if (!active) return

        setState({
          userId,
          loading: false,
          loadingMore: false,
          notifications:
            result.notifications,
          cursor: result.cursor,
          hasMore: result.hasMore,
          error: null,
          actionError: null,
          busyId: null,
          markingAll: false,
        })
      })
      .catch((error) => {
        if (!active) return

        setState({
          userId,
          loading: false,
          loadingMore: false,
          notifications:
            EMPTY_NOTIFICATIONS,
          cursor: null,
          hasMore: false,
          error,
          actionError: null,
          busyId: null,
          markingAll: false,
        })
      })

    return () => {
      active = false
    }
  }, [userId])

  const currentState =
    state.userId === userId
      ? state
      : {
          userId,
          loading: Boolean(userId),
          loadingMore: false,
          notifications:
            EMPTY_NOTIFICATIONS,
          cursor: null,
          hasMore: false,
          error: null,
          actionError: null,
          busyId: null,
          markingAll: false,
        }

  const loadMore = useCallback(
    async () => {
      if (
        !userId
        || currentState.loading
        || currentState.loadingMore
        || !currentState.hasMore
        || !currentState.cursor
      ) {
        return
      }

      setState(previous => ({
        ...previous,
        loadingMore: true,
        actionError: null,
      }))

      try {
        const result =
          await notificationService
            .loadNotificationsPage({
              pageSize: PAGE_SIZE,
              cursor:
                currentState.cursor,
            })

        setState(previous => {
          if (previous.userId !== userId) {
            return previous
          }

          return {
            ...previous,
            loadingMore: false,
            notifications:
              mergeNotifications(
                previous.notifications,
                result.notifications,
              ),
            cursor: result.cursor,
            hasMore: result.hasMore,
          }
        })
      } catch {
        setState(previous => ({
          ...previous,
          loadingMore: false,
          actionError:
            'notification/load-more',
        }))
      }
    },
    [
      userId,
      currentState.loading,
      currentState.loadingMore,
      currentState.hasMore,
      currentState.cursor,
    ],
  )

  const setReadState = useCallback(
    async (
      notificationId,
      read,
    ) => {
      if (!userId) return

      setState(previous => ({
        ...previous,
        busyId: notificationId,
        actionError: null,
      }))

      try {
        if (read) {
          await notificationService
            .markAsRead(notificationId)
        } else {
          await notificationService
            .markAsUnread(notificationId)
        }

        setState(previous => {
          if (previous.userId !== userId) {
            return previous
          }

          return {
            ...previous,
            busyId: null,
            notifications:
              previous.notifications.map(
                notification => (
                  notification.id
                    === notificationId
                    ? {
                        ...notification,
                        readAt: read
                          ? new Date()
                          : null,
                      }
                    : notification
                ),
              ),
          }
        })
      } catch {
        setState(previous => ({
          ...previous,
          busyId: null,
          actionError:
            'notification/action',
        }))
      }
    },
    [userId],
  )

  const markAllAsRead = useCallback(
    async () => {
      if (!userId) return

      setState(previous => ({
        ...previous,
        markingAll: true,
        actionError: null,
      }))

      try {
        await notificationService
          .markAllAsRead()

        const now = new Date()

        setState(previous => {
          if (previous.userId !== userId) {
            return previous
          }

          return {
            ...previous,
            markingAll: false,
            notifications:
              previous.notifications.map(
                notification => ({
                  ...notification,
                  readAt:
                    notification.readAt
                    ?? now,
                }),
              ),
          }
        })
      } catch {
        setState(previous => ({
          ...previous,
          markingAll: false,
          actionError:
            'notification/action',
        }))
      }
    },
    [userId],
  )

  return {
    notifications:
      currentState.notifications,
    loading: currentState.loading,
    loadingMore:
      currentState.loadingMore,
    hasMore: currentState.hasMore,
    error: currentState.error,
    actionError:
      currentState.actionError,
    busyId: currentState.busyId,
    markingAll:
      currentState.markingAll,
    loadMore,
    markAsRead:
      notificationId => (
        setReadState(
          notificationId,
          true,
        )
      ),
    markAsUnread:
      notificationId => (
        setReadState(
          notificationId,
          false,
        )
      ),
    markAllAsRead,
  }
}
