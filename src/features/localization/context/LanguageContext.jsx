import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  SUPPORTED_LOCALES,
  isSupportedLocale,
} from '../constants/locales.js'

import {
  persistLocale,
  readInitialLocale,
  translate,
} from '../core/localization.js'

export const LanguageContext = createContext(undefined)

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(
    () => readInitialLocale(),
  )

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback(nextLocale => {
    if (!isSupportedLocale(nextLocale)) {
      throw new TypeError('Unsupported locale.')
    }

    persistLocale(nextLocale)
    setLocaleState(nextLocale)
  }, [])

  const t = useCallback(
    (key, values) => translate(
      locale,
      key,
      values,
    ),
    [locale],
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      supportedLocales: SUPPORTED_LOCALES,
      t,
    }),
    [locale, setLocale, t],
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
