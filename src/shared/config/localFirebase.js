export const LOCAL_FIREBASE_PROJECT_ID = 'demo-moviedna'

export const LOCAL_FIREBASE_CONFIG = Object.freeze({
  apiKey: 'demo-moviedna-emulator-only',
  authDomain: `${LOCAL_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: LOCAL_FIREBASE_PROJECT_ID,
  storageBucket: `${LOCAL_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo-moviedna',
})

export const LOCAL_EMULATORS = Object.freeze({
  auth: 'http://127.0.0.1:9099',
  firestoreHost: '127.0.0.1',
  firestorePort: 8080,
  functionsHost: '127.0.0.1',
  functionsPort: 5001,
})

export function isLocalFirebaseMode(env = import.meta.env) {
  return env?.VITE_MOVIEDNA_LOCAL === 'true'
}
