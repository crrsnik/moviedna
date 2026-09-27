import { useEffect, useState } from 'react'
import { ratingService } from '../services/ratingService.js'
export function useRatingSubscription(uid, mediaKey) {
  const [attempt, setAttempt] = useState(0), [state, setState] = useState(null)
  const key = JSON.stringify([uid, mediaKey, attempt])
  useEffect(() => {
    if (!uid) return
    let active = true
    const next = data => { if (active) setState({ key, data, loading: false, error: null }) }
    const error = failure => { if (active) setState({ key, data: null, loading: false, error: failure.message }) }
    const stop = mediaKey === undefined ? ratingService.subscribeToUserRatings(uid, next, error) : ratingService.subscribeToRating(uid, mediaKey, next, error)
    return () => { active = false; stop() }
  }, [uid, mediaKey, key])
  return { ...(uid && state?.key === key ? state : { data: null, loading: Boolean(uid), error: null }), retry: () => setAttempt(value => value + 1) }
}
