import { useEffect, useState } from 'react'

import { useAuth } from '../../auth/hooks/useAuth.js'
import { viewingHistoryService } from '../services/viewingHistoryService.js'

export function useViewingHistory() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)

  const key = JSON.stringify([uid, attempt])

  useEffect(() => {
    if (!uid) return

    let active = true

    const stop = viewingHistoryService.subscribeToHistory(
      uid,
      data => {
        if (active) {
          setState({
            key,
            data,
            loading: false,
            error: null,
          })
        }
      },
      failure => {
        if (active) {
          setState({
            key,
            data: [],
            loading: false,
            error: failure?.code
              ?? failure?.message
              ?? 'unavailable',
          })
        }
      },
    )

    return () => {
      active = false
      stop()
    }
  }, [uid, key])

  return {
    uid,
    ...(uid && state?.key === key
      ? state
      : {
          data: [],
          loading: Boolean(uid),
          error: null,
        }),
    retry: () => setAttempt(value => value + 1),
  }
}
