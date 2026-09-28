export function enableFirebaseAppCheckDebug(value, registry = globalThis) {
  if (typeof value !== 'string' || !value.trim()) return false
  registry.FIREBASE_APPCHECK_DEBUG_TOKEN = value.trim() === 'true' ? true : value.trim()
  return true
}

export function configureFirebaseAppCheckDebug() {
  return enableFirebaseAppCheckDebug(import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN)
}
