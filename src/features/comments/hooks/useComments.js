import { useEffect, useState } from 'react'
import { commentService } from '../services/commentService.js'
export function useComments(media, uid = null, own = false) {
  const [attempt, setAttempt] = useState(0), [state, setState] = useState(null)
  const { mediaType, tmdbId } = media
  const key = JSON.stringify([mediaType, tmdbId, uid, own, attempt]), enabled = !own || Boolean(uid)
  useEffect(() => {
    if (!enabled) return
    let active = true
    const callbacks = {
      next: data => { if (active) setState({ key, data, loading: false, error: null }) },
      error: error => { if (active) setState({ key, data: null, loading: false, error: error.message }) },
    }
    const identity = { mediaType, tmdbId }
    const stop = own ? commentService.subscribeToOwnComment(uid, identity, callbacks) : commentService.subscribeToMediaComments(identity, callbacks)
    return () => { active = false; stop() }
  }, [key, enabled, mediaType, tmdbId, own, uid])
  return { ...(enabled && state?.key === key ? state : { data: null, loading: enabled, error: null }), retry: () => setAttempt(value => value + 1) }
}
