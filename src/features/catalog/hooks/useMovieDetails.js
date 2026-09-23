import { useEffect, useState } from 'react'
import { getMovieDetails } from '../services/movieDetailsService.js'
import { isValidMovieId } from '../validation/detailRouteValidation.js'
import { getTmdbErrorMessage, isTmdbAbort } from '../services/tmdbErrors.js'

export function useMovieDetails(movieId) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const valid = isValidMovieId(movieId)
  const key = `${movieId}:${attempt}`
  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    getMovieDetails({ movieId, signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ key, data, loading: false, error: null, notFound: false })
    }).catch((error) => {
      if (!controller.signal.aborted && !isTmdbAbort(error)) setState({ key, data: null, loading: false, notFound: error.code === 'missing', error: getTmdbErrorMessage(error) })
    })
    return () => controller.abort()
  }, [movieId, valid, key])
  const visible = valid && state?.key === key ? state : { data: null, loading: valid, error: null, notFound: !valid }
  return { ...visible, retry: () => setAttempt((n) => n + 1) }
}
