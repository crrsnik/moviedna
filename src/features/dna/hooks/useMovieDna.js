import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { movieDnaService } from '../services/movieDnaService.js'
import { deriveMovieDnaState } from './dnaState.js'

export function useMovieDna() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [snapshot, setSnapshot] = useState({ uid, loading: Boolean(uid), current: null, recalculation: null, error: null })
  if (snapshot.uid !== uid) setSnapshot({ uid, loading: Boolean(uid), current: null, recalculation: null, error: null })
  useEffect(() => {
    if (!uid) return
    let active = true
    const unsubscribe = movieDnaService.subscribe(uid, (value) => { if (active) setSnapshot({ uid, loading: false, ...value }) })
    return () => { active = false; unsubscribe() }
  }, [uid])
  return deriveMovieDnaState(snapshot)
}
