import { useEffect, useState } from 'react'
import { searchCatalog } from '../services/searchService.js'
import { getTmdbErrorMessage, isTmdbAbort } from '../services/tmdbErrors.js'
import { getQueryError } from '../validation/searchValidation.js'

export function useCatalogSearch({ query, type, page }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const key = JSON.stringify([query, type, page, attempt])
  const valid = !getQueryError(query)
  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    searchCatalog({ query, type, page, signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ key, data, loading: false, error: null })
    }).catch((error) => {
      if (!controller.signal.aborted && !isTmdbAbort(error)) setState({ key, data: null, loading: false, error: getTmdbErrorMessage(error) })
    })
    return () => controller.abort()
  }, [query, type, page, key, valid])
  // Keyed output hides stale data immediately, before the new effect runs.
  const visible = valid && state?.key === key ? state : { data: null, loading: valid, error: null }
  return { ...visible, retry: () => setAttempt((value) => value + 1) }
}
