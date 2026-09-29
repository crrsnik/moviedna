import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

import { initializeFirebaseAppCheck } from './firebaseAppCheck.js'
import { configureFirebaseAppCheckDebug } from '#firebase-app-check-debug'
import { connectFirebaseRuntime, isLocalFirebaseRuntime, selectFirebaseConfig } from '#firebase-runtime'

if (!isLocalFirebaseRuntime) configureFirebaseAppCheckDebug()

const requiredVariables = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingVariables = isLocalFirebaseRuntime ? [] : Object.entries(requiredVariables)
  .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
  .map(([name]) => name)

if (missingVariables.length > 0) {
  throw new Error(`Missing required Firebase environment variables: ${missingVariables.join(', ')}`)
}

const productionFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const firebaseConfig = selectFirebaseConfig(productionFirebaseConfig)
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const appCheck = isLocalFirebaseRuntime ? null : initializeFirebaseAppCheck(firebaseApp, import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
export const functions = getFunctions(firebaseApp, 'europe-west6')
export const storage = getStorage(firebaseApp)

connectFirebaseRuntime({ auth, db, functions }, {
  connectAuthEmulator,
  connectFirestoreEmulator,
  connectFunctionsEmulator,
})
