import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

const appCheckInstanceKey = Symbol.for('moviedna.firebase.app-check')

export function resolveAppCheckSettings(siteKey) {
  if (typeof siteKey !== 'string' || siteKey.trim() === '') {
    throw new Error('Missing required Firebase environment variable: VITE_FIREBASE_APPCHECK_SITE_KEY')
  }

  return { siteKey: siteKey.trim() }
}

export function initializeFirebaseAppCheck(
  app,
  siteKey,
  {
    initialize = initializeAppCheck,
    Provider = ReCaptchaEnterpriseProvider,
    registry = globalThis,
  } = {},
) {
  const existing = registry[appCheckInstanceKey]
  if (existing?.app === app) return existing.instance

  const settings = resolveAppCheckSettings(siteKey)

  const instance = initialize(app, {
    provider: new Provider(settings.siteKey),
    isTokenAutoRefreshEnabled: true,
  })
  registry[appCheckInstanceKey] = { app, instance }
  return instance
}
