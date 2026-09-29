import { LOCAL_EMULATORS, LOCAL_FIREBASE_CONFIG } from './localFirebase.js'

export const isLocalFirebaseRuntime = true

export function selectFirebaseConfig() {
  return LOCAL_FIREBASE_CONFIG
}

export function connectFirebaseRuntime({ auth, db, functions }, connectors) {
  const connectionKey = Symbol.for('moviedna.firebase.emulators.connected')
  if (globalThis[connectionKey]) return

  connectors.connectAuthEmulator(auth, LOCAL_EMULATORS.auth, { disableWarnings: true })
  connectors.connectFirestoreEmulator(db, LOCAL_EMULATORS.firestoreHost, LOCAL_EMULATORS.firestorePort)
  connectors.connectFunctionsEmulator(functions, LOCAL_EMULATORS.functionsHost, LOCAL_EMULATORS.functionsPort)
  globalThis[connectionKey] = true
}
