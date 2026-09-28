import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

const appCheckInstanceKey = Symbol.for('moviedna.firebase.app-check')

export function resolveAppCheckSettings(environment) {
  const siteKey = environment.VITE_FIREBASE_APPCHECK_SITE_KEY
  if (typeof siteKey !== 'string' || siteKey.trim() === '') {
    throw new Error('Missing required Firebase environment variable: VITE_FIREBASE_APPCHECK_SITE_KEY')
  }

  const debugValue = environment.DEV
    && typeof environment.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN === 'string'
    && environment.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN.trim()

  return {
    siteKey: siteKey.trim(),
    debugToken: debugValue
      ? (debugValue === 'true' ? true : debugValue)
      : null,
  }
}

export function initializeFirebaseAppCheck(
  app,
  environment,
  {
    initialize = initializeAppCheck,
    Provider = ReCaptchaEnterpriseProvider,
    registry = globalThis,
  } = {},
) {
  const existing = registry[appCheckInstanceKey]
  if (existing?.app === app) return existing.instance

  const { siteKey, debugToken } = resolveAppCheckSettings(environment)
  if (debugToken !== null) registry.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken

  const instance = initialize(app, {
    provider: new Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
  registry[appCheckInstanceKey] = { app, instance }
  return instance
}
