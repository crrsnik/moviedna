import { useEffect, useState } from 'react'

import { useAuth } from '../../auth/hooks/useAuth.js'
import { friendshipService } from '../services/friendshipService.js'

export function useIncomingFriendRequestCount() {
  const { user } = useAuth()
  const userId = user?.uid ?? null

  const [state, setState] = useState({
    userId: null,
    count: 0,
  })

  useEffect(() => {
    if (!userId) {
      setState({
        userId: null,
        count: 0,
      })

      return undefined
    }

    let active = true

    const unsubscribe =
      friendshipService.subscribeToFriendships(
        (friendships) => {
          if (!active) return

          const count = friendships.filter(
            (friendship) => (
              friendship.status === 'pending'
              && friendship.requestedBy !== userId
            ),
          ).length

          setState({
            userId,
            count,
          })
        },
        () => {
          if (!active) return

          setState({
            userId,
            count: 0,
          })
        },
      )

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [userId])

  if (state.userId !== userId) {
    return 0
  }

  return state.count
}
