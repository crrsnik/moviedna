import { useEffect, useState } from 'react'
import { mediaLibraryService } from '../services/mediaLibraryService.js'
export function useLibrarySubscription({ uid, mediaType, tmdbId, view }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const key = JSON.stringify([uid, mediaType, tmdbId, view, attempt])
  useEffect(() => {
    if (!uid) return
    let active = true
    const next = data => { if (active) setState({ key, data, loading: false, error: null }) }
    const error = failure => { if (active) setState({ key, data: null, loading: false, error: failure.message }) }
    const stop = view === undefined
      ? mediaLibraryService.subscribeToSavedMedia({ uid, mediaType, tmdbId }, next, error)
      : mediaLibraryService.subscribeToLibrary({ uid, view }, next, error)
    return () => { active = false; stop() }
  }, [uid, mediaType, tmdbId, view, key])
  return { ...(uid && state?.key === key ? state : { data: null, loading: Boolean(uid), error: null }), retry: () => setAttempt(n => n + 1) }
}
