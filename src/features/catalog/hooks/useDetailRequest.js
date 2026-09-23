import { useEffect, useState } from 'react'
import { isValidDetailId } from '../validation/detailRouteValidation.js'
import { getTmdbErrorMessage, isTmdbAbort } from '../services/tmdbErrors.js'

export function useDetailRequest(id, load) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const valid = isValidDetailId(id)
  const key = `${id}:${attempt}`
  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    load(id, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ key, load, data, loading: false, error: null, notFound: false })
    }).catch((error) => {
      if (!controller.signal.aborted && !isTmdbAbort(error)) setState({ key, load, data: null, loading: false, notFound: error.code === 'missing', error: getTmdbErrorMessage(error) })
    })
    return () => controller.abort()
  }, [id, valid, key, load])
  const visible = valid && state?.key === key && state.load === load ? state : { data: null, loading: valid, error: null, notFound: !valid }
  return { ...visible, retry: () => setAttempt((n) => n + 1) }
}
