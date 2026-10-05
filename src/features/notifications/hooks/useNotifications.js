import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useAuth,
} from '../../auth/hooks/useAuth.js'

import {
  notificationService,
} from '../services/notificationService.js'

const EMPTY_NOTIFICATIONS = Object.freeze([])

export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.uid ?? null

  const [state, setState] = useState({
    userId: null,
    loading: false,
    notifications: EMPTY_NOTIFICATIONS,
    error: null,
  })

  useEffect(() => {
    if (!userId) {
      setState({
        userId: null,
        loading: false,
        notifications: EMPTY_NOTIFICATIONS,
        error: null,
      })

      return undefined
    }

    let active = true

    setState({
      userId,
      loading: true,
      notifications: EMPTY_NOTIFICATIONS,
      error: null,
    })

    const unsubscribe =
      notificationService.subscribeToNotifications(
        (notifications) => {
          if (!active) return

          setState({
            userId,
            loading: false,
            notifications,
            error: null,
          })
        },
        (error) => {
          if (!active) return

          setState({
            userId,
            loading: false,
            notifications: EMPTY_NOTIFICATIONS,
            error,
          })
        },
      )

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [userId])

  const currentState = state.userId === userId
    ? state
    : {
        userId,
        loading: Boolean(userId),
        notifications: EMPTY_NOTIFICATIONS,
        error: null,
      }

  const unreadCount = useMemo(
    () => (
      currentState.notifications.filter(
        notification => notification.readAt === null,
      ).length
    ),
    [currentState.notifications],
  )

  const markAsRead = useCallback(
    notificationId => (
      notificationService.markAsRead(
        notificationId,
      )
    ),
    [],
  )

  const markAsUnread = useCallback(
    notificationId => (
      notificationService.markAsUnread(
        notificationId,
      )
    ),
    [],
  )

  const markAllAsRead = useCallback(
    () => notificationService.markAllAsRead(),
    [],
  )

  return {
    notifications: currentState.notifications,
    unreadCount,
    loading: currentState.loading,
    error: currentState.error,
    markAsRead,
    markAsUnread,
    markAllAsRead,
  }
}
