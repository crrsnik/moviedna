import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LANGUAGE_STORAGE_KEY,
} from '../constants/locales.js'

import { messages } from '../messages/index.js'

function baseLocale(value) {
  if (typeof value !== 'string') return null

  const normalized = value
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0]

  return isSupportedLocale(normalized)
    ? normalized
    : null
}

export function resolveLocale({
  storedLocale,
  browserLocales = [],
} = {}) {
  const stored = baseLocale(storedLocale)

  if (stored) return stored

  for (const locale of browserLocales) {
    const resolved = baseLocale(locale)

    if (resolved) return resolved
  }

  return DEFAULT_LOCALE
}

export function readInitialLocale({
  storage = typeof window !== 'undefined'
    ? window.localStorage
    : null,
  navigatorObject = typeof navigator !== 'undefined'
    ? navigator
    : null,
} = {}) {
  let storedLocale = null

  try {
    storedLocale = storage?.getItem(
      LANGUAGE_STORAGE_KEY,
    ) ?? null
  } catch {
    // Storage may be unavailable in restricted browsers.
  }

  const browserLocales = Array.isArray(
    navigatorObject?.languages,
  )
    ? navigatorObject.languages
    : navigatorObject?.language
      ? [navigatorObject.language]
      : []

  return resolveLocale({
    storedLocale,
    browserLocales,
  })
}

export function persistLocale(
  locale,
  storage = typeof window !== 'undefined'
    ? window.localStorage
    : null,
) {
  if (!isSupportedLocale(locale)) {
    throw new TypeError('Unsupported locale.')
  }

  try {
    storage?.setItem(
      LANGUAGE_STORAGE_KEY,
      locale,
    )
  } catch {
    // Language still changes for the current session.
  }

  return locale
}

function readMessage(source, key) {
  return key
    .split('.')
    .reduce(
      (value, part) => (
        value
        && typeof value === 'object'
          ? value[part]
          : undefined
      ),
      source,
    )
}

function interpolate(message, values) {
  if (!values) return message

  return message.replace(
    /\{([A-Za-z0-9_]+)\}/g,
    (match, name) => (
      Object.hasOwn(values, name)
        ? String(values[name])
        : match
    ),
  )
}

export function translate(
  locale,
  key,
  values,
) {
  const activeLocale = isSupportedLocale(locale)
    ? locale
    : DEFAULT_LOCALE

  const localized = readMessage(
    messages[activeLocale],
    key,
  )

  const fallback = readMessage(
    messages[DEFAULT_LOCALE],
    key,
  )

  const message = typeof localized === 'string'
    ? localized
    : typeof fallback === 'string'
      ? fallback
      : key

  return interpolate(message, values)
}
