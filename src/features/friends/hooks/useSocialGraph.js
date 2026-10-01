import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { useAuth } from '../../auth/hooks/useAuth.js'
import {
  getPublicProfileByUserId,
} from '../../profile/services/publicProfileService.js'
import { friendshipService } from '../services/friendshipService.js'

const EMPTY_GRAPH = {
  friends: [],
  incoming: [],
  outgoing: [],
}

function sortEntries(entries) {
  return [...entries].sort((first, second) => {
    const firstName = (
      first.profile.displayName
      || first.profile.username
    )

    const secondName = (
      second.profile.displayName
      || second.profile.username
    )

    return firstName.localeCompare(secondName)
  })
}

function buildGraph(entries, currentUserId) {
  const graph = {
    friends: [],
    incoming: [],
    outgoing: [],
  }

  for (const entry of entries) {
    const { friendship } = entry

    if (friendship.status === 'accepted') {
      graph.friends.push(entry)
      continue
    }

    if (friendship.requestedBy === currentUserId) {
      graph.outgoing.push(entry)
      continue
    }

    graph.incoming.push(entry)
  }

  return {
    friends: sortEntries(graph.friends),
    incoming: sortEntries(graph.incoming),
    outgoing: sortEntries(graph.outgoing),
  }
}

export function useSocialGraph() {
  const { user } = useAuth()
  const currentUserId = user?.uid ?? null

  const [state, setState] = useState({
    userId: null,
    loading: true,
    graph: EMPTY_GRAPH,
    error: null,
    busyUserId: null,
    actionError: null,
  })

  useEffect(() => {
    if (!currentUserId) {
      setState({
        userId: null,
        loading: false,
        graph: EMPTY_GRAPH,
        error: null,
        busyUserId: null,
        actionError: null,
      })

      return undefined
    }

    let active = true
    let revision = 0

    setState({
      userId: currentUserId,
      loading: true,
      graph: EMPTY_GRAPH,
      error: null,
      busyUserId: null,
      actionError: null,
    })

    const unsubscribe =
      friendshipService.subscribeToFriendships(
        (friendships) => {
          const currentRevision = ++revision

          Promise.all(
            friendships.map(async (friendship) => {
              const otherUserId = friendship.members.find(
                (member) => member !== currentUserId,
              )

              if (!otherUserId) {
                throw new Error(
                  'Invalid friendship membership',
                )
              }

              const profile =
                await getPublicProfileByUserId(
                  otherUserId,
                )

              return {
                friendship,
                profile,
              }
            }),
          )
            .then((entries) => {
              if (
                !active
                || currentRevision !== revision
              ) {
                return
              }

              setState((previous) => ({
                ...previous,
                userId: currentUserId,
                loading: false,
                graph: buildGraph(
                  entries,
                  currentUserId,
                ),
                error: null,
              }))
            })
            .catch((error) => {
              if (
                !active
                || currentRevision !== revision
              ) {
                return
              }

              setState((previous) => ({
                ...previous,
                userId: currentUserId,
                loading: false,
                graph: EMPTY_GRAPH,
                error,
              }))
            })
        },
        (error) => {
          if (!active) return

          setState((previous) => ({
            ...previous,
            userId: currentUserId,
            loading: false,
            graph: EMPTY_GRAPH,
            error,
          }))
        },
      )

    return () => {
      active = false
      revision += 1
      unsubscribe?.()
    }
  }, [currentUserId])

  const performAction = useCallback(
    async (action, targetUserId) => {
      setState((previous) => ({
        ...previous,
        busyUserId: targetUserId,
        actionError: null,
      }))

      try {
        await friendshipService[action](
          targetUserId,
        )
      } catch (error) {
        setState((previous) => ({
          ...previous,
          actionError: error,
        }))
      } finally {
        setState((previous) => ({
          ...previous,
          busyUserId:
            previous.busyUserId === targetUserId
              ? null
              : previous.busyUserId,
        }))
      }
    },
    [],
  )

  const currentState = (
    state.userId === currentUserId
  )
    ? state
    : {
        userId: currentUserId,
        loading: true,
        graph: EMPTY_GRAPH,
        error: null,
        busyUserId: null,
        actionError: null,
      }

  return {
    ...currentState,
    acceptRequest: (userId) => performAction(
      'acceptFriendRequest',
      userId,
    ),
    declineRequest: (userId) => performAction(
      'declineFriendRequest',
      userId,
    ),
    cancelRequest: (userId) => performAction(
      'cancelFriendRequest',
      userId,
    ),
    removeFriend: (userId) => performAction(
      'removeFriend',
      userId,
    ),
  }
}
