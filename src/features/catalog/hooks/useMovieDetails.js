import { useCallback } from 'react'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { toTmdbLanguage } from '../../../shared/config/tmdb.js'
import { useDetailRequest } from './useDetailRequest.js'
import { getMovieDetails } from '../services/movieDetailsService.js'

export function useMovieDetails(movieId) {
  const { locale } = useTranslation()
  const language = toTmdbLanguage(locale)

  const load = useCallback(
    (id, signal) => getMovieDetails({
      movieId: id,
      language,
      signal,
    }),
    [language],
  )

  return useDetailRequest(movieId, load)
}
