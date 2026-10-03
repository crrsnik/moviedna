import { useEffect, useState } from 'react'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { toTmdbLanguage } from '../../../shared/config/tmdb.js'
import {
  getTrendingMovies,
  getTrendingTvShows,
} from '../services/catalogService.js'
import {
  getTmdbErrorMessage,
  isTmdbAbort,
} from '../services/tmdbErrors.js'

function useCatalogSection(load, language) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const key = `${language}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()

    load({
      language,
      signal: controller.signal,
    }).then((data) => {
      if (!controller.signal.aborted) {
        setState({
          key,
          data,
          isLoading: false,
          error: null,
        })
      }
    }).catch((error) => {
      if (
        !controller.signal.aborted
        && !isTmdbAbort(error)
      ) {
        setState({
          key,
          data: [],
          isLoading: false,
          error: getTmdbErrorMessage(error),
        })
      }
    })

    return () => controller.abort()
  }, [load, language, key])

  const visible = state?.key === key
    ? state
    : {
        data: [],
        isLoading: true,
        error: null,
      }

  function retry() {
    setAttempt(current => current + 1)
  }

  return {
    ...visible,
    retry,
  }
}

export function useTrendingCatalog() {
  const { locale } = useTranslation()
  const language = toTmdbLanguage(locale)

  // Independent effects start together; retrying one section
  // preserves the other.
  const movies = useCatalogSection(
    getTrendingMovies,
    language,
  )

  const tvShows = useCatalogSection(
    getTrendingTvShows,
    language,
  )

  return {
    movies,
    tvShows,
  }
}
