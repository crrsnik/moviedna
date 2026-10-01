import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useAuth } from '../../auth/hooks/useAuth.js'
import { friendshipService } from '../services/friendshipService.js'

function relationshipStatus(friendship, currentUserId) {
  if (!friendship) return 'none'

  if (friendship.status === 'accepted') {
    return 'friends'
  }

  if (friendship.requestedBy === currentUserId) {
    return 'outgoing-pending'
  }

  return 'incoming-pending'
}

export function useFriendship(targetUserId) {
  const { user } = useAuth()
  const currentUserId = user?.uid ?? null

  const relationshipKey = (
    currentUserId
    && targetUserId
  )
    ? `${currentUserId}:${targetUserId}`
    : null

  const [state, setState] = useState({
    relationshipKey: null,
    loading: false,
    friendship: null,
    busy: false,
    error: null,
  })

  useEffect(() => {
    if (
      !relationshipKey
      || currentUserId === targetUserId
    ) {
      setState({
        relationshipKey,
        loading: false,
        friendship: null,
        busy: false,
        error: null,
      })

      return undefined
    }

    let active = true

    setState({
      relationshipKey,
      loading: true,
      friendship: null,
      busy: false,
      error: null,
    })

    const unsubscribe =
      friendshipService.subscribeToFriendships(
        (friendships) => {
          if (!active) return

          const friendship = friendships.find(
            ({ members }) => (
              members.includes(targetUserId)
            ),
          ) ?? null

          setState((previous) => ({
            ...previous,
            relationshipKey,
            loading: false,
            friendship,
            error: null,
          }))
        },
        (error) => {
          if (!active) return

          setState((previous) => ({
            ...previous,
            relationshipKey,
            loading: false,
            error,
          }))
        },
      )

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [
    relationshipKey,
    currentUserId,
    targetUserId,
  ])

  const performAction = useCallback(
    async (action) => {
      if (
        !targetUserId
        || !currentUserId
        || currentUserId === targetUserId
      ) {
        return
      }

      setState((previous) => ({
        ...previous,
        busy: true,
        error: null,
      }))

      try {
        await friendshipService[action](
          targetUserId,
        )
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error,
        }))
      } finally {
        setState((previous) => ({
          ...previous,
          busy: false,
        }))
      }
    },
    [
      currentUserId,
      targetUserId,
    ],
  )

  const currentState = (
    state.relationshipKey === relationshipKey
  )
    ? state
    : {
        relationshipKey,
        loading: true,
        friendship: null,
        busy: false,
        error: null,
      }

  const status = useMemo(
    () => relationshipStatus(
      currentState.friendship,
      currentUserId,
    ),
    [
      currentState.friendship,
      currentUserId,
    ],
  )

  return {
    loading: currentState.loading,
    busy: currentState.busy,
    error: currentState.error,
    friendship: currentState.friendship,
    status,

    sendRequest: () => performAction(
      'createFriendRequest',
    ),

    acceptRequest: () => performAction(
      'acceptFriendRequest',
    ),

    cancelRequest: () => performAction(
      'cancelFriendRequest',
    ),

    declineRequest: () => performAction(
      'declineFriendRequest',
    ),

    removeFriend: () => performAction(
      'removeFriend',
    ),
  }
}
