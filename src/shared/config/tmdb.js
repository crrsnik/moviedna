export const TMDB_BASE_PATH = '/api/tmdb'
export const TMDB_DEFAULT_LANGUAGE = 'en-US'

export const TMDB_LANGUAGE_BY_LOCALE = Object.freeze({
  en: 'en-US',
  fr: 'fr-FR',
  ru: 'ru-RU',
})

export const TMDB_LANGUAGES = Object.freeze(
  Object.values(TMDB_LANGUAGE_BY_LOCALE),
)

export function toTmdbLanguage(locale) {
  return TMDB_LANGUAGE_BY_LOCALE[locale]
    ?? TMDB_DEFAULT_LANGUAGE
}

export function isTmdbLanguage(value) {
  return TMDB_LANGUAGES.includes(value)
}

export const TMDB_WEBSITE_URL = 'https://www.themoviedb.org/'
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
export const TMDB_POSTER_SIZES = ['w342', 'w500']
