import {
  useEffect,
  useState,
} from 'react'

import {
  useAuth,
} from '../../auth/hooks/useAuth.js'

import {
  achievementService,
} from '../services/achievementService.js'

const EMPTY = Object.freeze({
  uid: null,
  loading: false,
  data: null,
  error: null,
})

export function useAchievements() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [state, setState] = useState(EMPTY)

  useEffect(() => {
    if (!uid) {
      setState(EMPTY)
      return undefined
    }

    let active = true

    setState({
      uid,
      loading: true,
      data: null,
      error: null,
    })

    const unsubscribe = achievementService.subscribe(
      uid,
      data => {
        if (!active) return

        setState({
          uid,
          loading: false,
          data,
          error: null,
        })
      },
      error => {
        if (!active) return

        setState({
          uid,
          loading: false,
          data: null,
          error,
        })
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [uid])

  return state
}
