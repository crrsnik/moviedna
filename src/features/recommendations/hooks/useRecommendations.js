import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { recommendationService } from '../services/recommendationService.js'
import { deriveRecommendationState } from './recommendationState.js'

export function useRecommendations() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [attempt, setAttempt] = useState(0)

  const [snapshot, setSnapshot] = useState({
    uid,
    loading: Boolean(uid),
    data: null,
    error: null,
  })

  useEffect(() => {
    if (!uid) {
      setSnapshot({
        uid: null,
        loading: false,
        data: null,
        error: null,
      })

      return undefined
    }

    let active = true

    setSnapshot({
      uid,
      loading: true,
      data: null,
      error: null,
    })

    recommendationService
      .getRecommendations()
      .then(data => {
        if (!active) return

        setSnapshot({
          uid,
          loading: false,
          data,
          error: null,
        })
      })
      .catch(error => {
        if (!active) return

        setSnapshot({
          uid,
          loading: false,
          data: null,
          error,
        })
      })

    return () => {
      active = false
    }
  }, [uid, attempt])

  const retry = useCallback(() => {
    if (uid) setAttempt(value => value + 1)
  }, [uid])

  const effectiveSnapshot = snapshot.uid === uid
    ? snapshot
    : {
        uid,
        loading: Boolean(uid),
        data: null,
        error: null,
      }

  return {
    ...deriveRecommendationState(
      effectiveSnapshot,
    ),
    retry,
  }
}
