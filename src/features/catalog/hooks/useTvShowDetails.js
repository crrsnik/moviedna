import { useCallback } from 'react'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { toTmdbLanguage } from '../../../shared/config/tmdb.js'
import { useDetailRequest } from './useDetailRequest.js'
import { getTvShowDetails } from '../services/tvShowDetailsService.js'

export function useTvShowDetails(seriesId) {
  const { locale } = useTranslation()
  const language = toTmdbLanguage(locale)

  const load = useCallback(
    (id, signal) => getTvShowDetails({
      seriesId: id,
      language,
      signal,
    }),
    [language],
  )

  return useDetailRequest(seriesId, load)
}
