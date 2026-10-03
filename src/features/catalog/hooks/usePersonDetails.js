import { useCallback } from 'react'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { toTmdbLanguage } from '../../../shared/config/tmdb.js'
import { useDetailRequest } from './useDetailRequest.js'
import { getPersonDetails } from '../services/personDetailsService.js'

export function usePersonDetails(personId) {
  const { locale } = useTranslation()
  const language = toTmdbLanguage(locale)

  const load = useCallback(
    (id, signal) => getPersonDetails({
      personId: id,
      language,
      signal,
    }),
    [language],
  )

  return useDetailRequest(personId, load)
}
