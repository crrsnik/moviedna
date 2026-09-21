import { useEffect, useState } from 'react'
import { getTrendingMovies, getTrendingTvShows } from '../services/catalogService.js'
import { getTmdbErrorMessage, isTmdbAbort } from '../services/tmdbErrors.js'

function useCatalogSection(load) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ data: [], isLoading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ data, isLoading: false, error: null })
    }).catch((error) => {
      if (!controller.signal.aborted && !isTmdbAbort(error)) {
        setState({ data: [], isLoading: false, error: getTmdbErrorMessage(error) })
      }
    })
    return () => controller.abort()
  }, [load, attempt])

  function retry() {
    setState({ data: [], isLoading: true, error: null })
    setAttempt((current) => current + 1)
  }
  return { ...state, retry }
}

export function useTrendingCatalog() {
  // Independent effects start together; retrying one section preserves the other.
  const movies = useCatalogSection(getTrendingMovies)
  const tvShows = useCatalogSection(getTrendingTvShows)
  return { movies, tvShows }
}
