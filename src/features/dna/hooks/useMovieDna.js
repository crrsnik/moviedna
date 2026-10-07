import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { movieDnaService } from '../services/movieDnaService.js'
import { movieDnaSnapshotCache } from '../services/movieDnaSnapshotCache.js'
import { deriveMovieDnaState } from './dnaState.js'

export function useMovieDna() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [snapshot, setSnapshot] = useState(() => {
    const cached = uid
      ? movieDnaSnapshotCache.get(uid)
      : null

    return cached
      ? {
          uid,
          loading: false,
          ...cached,
        }
      : {
          uid,
          loading: Boolean(uid),
          current: null,
          recalculation: null,
          error: null,
        }
  })
  if (snapshot.uid !== uid) {
    const cached = uid
      ? movieDnaSnapshotCache.get(uid)
      : null

    setSnapshot(
      cached
        ? {
            uid,
            loading: false,
            ...cached,
          }
        : {
            uid,
            loading: Boolean(uid),
            current: null,
            recalculation: null,
            error: null,
          },
    )
  }
  useEffect(() => {
    if (!uid) return
    let active = true
    const unsubscribe = movieDnaService.subscribe(
      uid,
      value => {
        if (!active) return

        movieDnaSnapshotCache.set(
          uid,
          value,
        )

        setSnapshot({
          uid,
          loading: false,
          ...value,
        })
      },
    )
    return () => { active = false; unsubscribe() }
  }, [uid])
  return deriveMovieDnaState(snapshot)
}
