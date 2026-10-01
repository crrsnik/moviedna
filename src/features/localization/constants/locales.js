export const DEFAULT_LOCALE = 'en'

export const SUPPORTED_LOCALES = Object.freeze([
  'en',
  'fr',
  'ru',
])

export const LANGUAGE_STORAGE_KEY = 'moviedna.language'

export function isSupportedLocale(value) {
  return (
    typeof value === 'string'
    && SUPPORTED_LOCALES.includes(value)
  )
}
