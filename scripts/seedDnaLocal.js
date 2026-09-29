import { createRequire } from 'node:module'

const PROJECT = 'demo-moviedna'
const AUTH_HOST = '127.0.0.1:9099'
const FIRESTORE_HOST = '127.0.0.1:8080'
const EMAIL = 'dna.local@demo.invalid'
const PASSWORD = 'MovieDNA-local-2026!'

if (process.env.GCLOUD_PROJECT !== PROJECT || process.env.FIREBASE_CONFIG !== JSON.stringify({ projectId: PROJECT })
  || process.env.FIREBASE_AUTH_EMULATOR_HOST !== AUTH_HOST || process.env.FIRESTORE_EMULATOR_HOST !== FIRESTORE_HOST) {
  throw new Error('Refusing to seed: exact demo-moviedna Emulator hosts are required.')
}

const request = async (action) => {
  const response = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:${action}?key=demo`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  })
  return { ok: response.ok, body: await response.json() }
}
let auth = await request('signUp')
if (!auth.ok && auth.body?.error?.message === 'EMAIL_EXISTS') auth = await request('signInWithPassword')
if (!auth.ok || typeof auth.body?.localId !== 'string') throw new Error('Auth Emulator seed failed.')

const requireFunctions = createRequire(new URL('../functions/package.json', import.meta.url))
const { initializeApp, deleteApp } = requireFunctions('firebase-admin/app')
const { getFirestore, Timestamp, FieldValue } = requireFunctions('firebase-admin/firestore')
const app = initializeApp({ projectId: PROJECT }, 'moviedna-local-seed')
const db = getFirestore(app)
const uid = auth.body.localId
const user = db.collection('users').doc(uid)
const complete = { genres: true, releaseYear: true, originalLanguage: true, countries: true, people: true }
const metadata = (id, mediaType, genreIds, year, language, country, personId) => ({
  schemaVersion: 1, tmdbId: id, mediaType, genreIds, releaseYear: year, originalLanguage: language,
  countryCodes: [country], directors: mediaType === 'movie' ? [{ id: 7001, name: 'Synthetic Director' }] : [],
  creators: mediaType === 'tv' ? [{ id: 7002, name: 'Synthetic Creator' }] : [],
  actors: [{ id: personId, name: 'Synthetic Performer', billingOrder: 0 }], metadataStatus: 'ready',
  metadataCompleteness: complete, fetchedAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
})

await Promise.all([
  db.collection('mediaSignals').doc('movie_910001').set(metadata(910001, 'movie', [18, 878], 1999, 'en', 'US', 8001)),
  db.collection('mediaSignals').doc('movie_910002').set(metadata(910002, 'movie', [18], 2004, 'fr', 'FR', 8001)),
  db.collection('mediaSignals').doc('tv_920001').set(metadata(920001, 'tv', [35], 2020, 'en', 'GB', 8002)),
])
await user.set({ username: 'dna_local', displayName: 'DNA Local Tester', photoURL: null, bio: '', onboardingCompleted: true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
await user.collection('onboardingResponses').doc('910001').set({ tmdbId: 910001, mediaType: 'movie', reaction: 'like', genreIds: [18, 878] })
await user.collection('onboarding').doc('summary').set({ version: 1, userId: uid, status: 'completed', totalResponses: 1, ratedResponses: 1, liked: 1, disliked: 0, skipped: 0, genreReactionCounts: {}, completedAt: FieldValue.serverTimestamp() })
await user.collection('ratings').doc('movie_910002').set({ tmdbId: 910002, mediaType: 'movie', title: 'Synthetic French Drama', posterPath: null, releaseYear: 2004, score: 9, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
await user.collection('savedMedia').doc('tv_920001').set({ tmdbId: 920001, mediaType: 'tv', title: 'Synthetic Comedy Series', posterPath: null, releaseYear: 2020, favorite: true, watchlist: false, listIds: [], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })

const dnaRef = user.collection('movieDna').doc('current')
const deadline = Date.now() + 15_000
let dna
while (Date.now() < deadline) {
  const result = await dnaRef.get()
  if (result.exists && result.data()?.status === 'ready') { dna = result.data(); break }
  await new Promise(resolve => setTimeout(resolve, 150))
}
if (!dna) throw new Error('Local MovieDNA calculation did not complete.')
console.log(`Local Emulator seed ready (${dna.sourceCounts.uniqueNonZeroUsed} signals). Sign in with ${EMAIL} / ${PASSWORD}`)
await deleteApp(app)
