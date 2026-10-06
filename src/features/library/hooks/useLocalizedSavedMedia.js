import {
  useEffect,
  useState,
} from 'react'

import {
  toTmdbLanguage,
} from '../../../shared/config/tmdb.js'

import {
  loadLocalizedSavedMedia,
} from '../services/localizedSavedMediaService.js'

export function useLocalizedSavedMedia(
  item,
  locale,
) {
  const language =
    toTmdbLanguage(locale)

  const key = [
    language,
    item.mediaType,
    item.tmdbId,
  ].join(':')

  const [
    localized,
    setLocalized,
  ] = useState(null)

  useEffect(() => {
    let active = true

    // Show the saved snapshot immediately
    // while the localized TMDb display data
    // is being resolved.
    setLocalized(null)

    loadLocalizedSavedMedia(
      item,
      language,
    )
      .then(display => {
        if (active) {
          setLocalized({
            key,
            display,
          })
        }
      })
      .catch(() => {
        // The persisted library snapshot
        // remains a safe fallback.
      })

    return () => {
      active = false
    }
  }, [
    key,
    language,
    item,
  ])

  if (
    !localized
    || localized.key !== key
  ) {
    return item
  }

  return {
    ...item,
    ...localized.display,
  }
}
