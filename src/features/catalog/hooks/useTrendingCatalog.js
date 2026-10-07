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

import {
  trendingCatalogCache,
} from '../services/trendingCatalogCache.js'

function useCatalogSection(
  type,
  load,
  language,
) {
  const [attempt, setAttempt] = useState(0)

  const cached = trendingCatalogCache.get(
    type,
    language,
  )

  const [state, setState] = useState(
    cached
      ? {
          key: `${language}:0`,
          data: cached.data,
          isLoading: false,
          error: null,
        }
      : null,
  )

  const key = `${language}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()

    const cached = trendingCatalogCache.get(
      type,
      language,
    )

    if (
      cached
      && cached.fresh
      && attempt === 0
    ) {
      setState({
        key,
        data: cached.data,
        isLoading: false,
        error: null,
      })

      return () => controller.abort()
    }

    load({
      language,
      signal: controller.signal,
    }).then((data) => {
      if (!controller.signal.aborted) {
        trendingCatalogCache.set(
          type,
          language,
          data,
        )

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
  }, [
    type,
    load,
    language,
    key,
    attempt,
  ])

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
    'movie',
    getTrendingMovies,
    language,
  )

  const tvShows = useCatalogSection(
    'tv',
    getTrendingTvShows,
    language,
  )

  return {
    movies,
    tvShows,
  }
}
