import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, before, describe, it } from 'node:test'

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc } from 'firebase/firestore'

const requireFromFunctions = createRequire(new URL('../../functions/package.json', import.meta.url))
const { deleteApp, getApps, initializeApp } = requireFromFunctions('firebase-admin/app')
const { FieldValue, Timestamp, getFirestore } = requireFromFunctions('firebase-admin/firestore')

const projectId = 'demo-moviedna'
let adminApp
let db
let rulesEnv

function profile(onboardingCompleted = true) {
  return {
    username: 'synthetic_user', displayName: 'Synthetic User', photoURL: null, bio: '',
    onboardingCompleted,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  }
}

function cache(tmdbId, mediaType = 'movie') {
  return {
    schemaVersion: 1, tmdbId, mediaType, genreIds: [28], keywords: [], releaseYear: 2020,
    originalLanguage: 'en', countryCodes: ['US'],
    directors: mediaType === 'movie' ? [{ id: 2, name: 'Synthetic Director' }] : [],
    creators: mediaType === 'tv' ? [{ id: 3, name: 'Synthetic Creator' }] : [],
    actors: [{ id: 4, name: 'Synthetic Actor', billingOrder: 0 }],
    collectionId: null,
    metadataStatus: 'ready',
    metadataCompleteness: {
      genres: true, releaseYear: true, originalLanguage: true, countries: true, people: true,
    },
    fetchedAt: Timestamp.fromMillis(Date.now() - 1000),
    expiresAt: Timestamp.fromMillis(Date.now() + 3_600_000),
  }
}

async function prepare(uid, ids) {
  await db.collection('users').doc(uid).set(profile())
  await Promise.all(ids.map((id) => db.collection('mediaSignals').doc(`movie_${id}`).set(cache(id))))
  await db.collection('users').doc(uid).collection('onboarding').doc('summary').set({
    version: 1, userId: uid, status: 'completed',
  })
}

async function waitFor(read, predicate, timeout = 15_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const value = await read()
    if (predicate(value)) return value
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Timed out waiting for local Functions Emulator result.')
}

async function current(uid) {
  const snapshot = await db.collection('users').doc(uid).collection('movieDna').doc('current').get()
  return snapshot.exists ? snapshot.data() : null
}

describe('MovieDNA Functions and Firestore Emulator integration', { concurrency: false }, () => {
  before(async () => {
    adminApp = initializeApp({ projectId }, 'moviedna-integration')
    db = getFirestore(adminApp)
    rulesEnv = await initializeTestEnvironment({
      projectId,
      firestore: { host: '127.0.0.1', port: 8080 },
    })
  })

  after(async () => {
    await rulesEnv?.cleanup()
    if (adminApp) await deleteApp(adminApp)
    for (const app of getApps().filter((value) => value.name === 'moviedna-integration')) await deleteApp(app)
  })

  it('rating create/update/delete recalculates private DNA and keeps Rules privacy', async () => {
    const uid = 'integration-rating-user'
    await prepare(uid, [101])
    const rating = db.collection('users').doc(uid).collection('ratings').doc('movie_101')
    await rating.set({ tmdbId: 101, mediaType: 'movie', score: 8 })
    const created = await waitFor(() => current(uid), (value) => value?.sourceCounts?.ratingUsed === 1)
    const firstFingerprint = created.inputFingerprint

    await rating.update({ score: 10 })
    const updated = await waitFor(() => current(uid), (value) => value && value.inputFingerprint !== firstFingerprint)
    assert.equal(updated.dimensions.mediaTypes[0].signedContribution, 1)

    await rating.delete()
    const deleted = await waitFor(() => current(uid), (value) => value?.status === 'insufficient-data')
    assert.equal(deleted.sourceCounts.ratingUsed, 0)

    const owner = rulesEnv.authenticatedContext(uid).firestore()
    const other = rulesEnv.authenticatedContext('integration-other').firestore()
    const guest = rulesEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(owner, `users/${uid}/movieDna/current`)))
    await assertFails(getDoc(doc(other, `users/${uid}/movieDna/current`)))
    await assertFails(getDoc(doc(guest, `users/${uid}/movieDna/current`)))
  })

  it('onboarding summary event calculates onboarding DNA', async () => {
    const uid = 'integration-onboarding-user'
    await db.collection('users').doc(uid).set(profile(false))
    await db.collection('mediaSignals').doc('movie_102').set(cache(102))
    const user = db.collection('users').doc(uid)
    await user.collection('onboardingResponses').doc('102').set({
      tmdbId: 102, mediaType: 'movie', reaction: 'like', genreIds: [28],
    })
    const batch = db.batch()
    batch.update(user, { onboardingCompleted: true, updatedAt: FieldValue.serverTimestamp() })
    batch.set(user.collection('onboarding').doc('summary'), {
      version: 1, userId: uid, status: 'completed',
    })
    await batch.commit()
    const dna = await waitFor(() => current(uid), (value) => value?.sourceCounts?.onboardingUsed === 1)
    assert.equal(dna.dimensions.mediaTypes[0].signedContribution, 0.35)
  })

  it('Favorite triggers fallback while Watchlist-only write is a no-op', async () => {
    const favoriteUid = 'integration-favorite-user'
    await prepare(favoriteUid, [103])
    await db.collection('users').doc(favoriteUid).collection('savedMedia').doc('movie_103').set({
      tmdbId: 103, mediaType: 'movie', favorite: true, watchlist: false, listIds: [],
    })
    const favorite = await waitFor(() => current(favoriteUid), (value) => value?.sourceCounts?.favoriteUsed === 1)
    assert.equal(favorite.dimensions.mediaTypes[0].signedContribution, 0.2)

    const watchlistUid = 'integration-watchlist-user'
    await prepare(watchlistUid, [104])
    const beforeWatchlist = await waitFor(
      () => current(watchlistUid),
      (value) => value?.status === 'insufficient-data',
    )
    await db.collection('users').doc(watchlistUid).collection('savedMedia').doc('movie_104').set({
      tmdbId: 104, mediaType: 'movie', favorite: false, watchlist: true, listIds: [],
    })
    await new Promise((resolve) => setTimeout(resolve, 1200))
    assert.equal((await current(watchlistUid)).updatedAt.toMillis(), beforeWatchlist.updatedAt.toMillis())
  })

  it('repeated input is idempotent and rapid changes keep the newest source', async () => {
    const uid = 'integration-stale-user'
    await prepare(uid, [105])
    const rating = db.collection('users').doc(uid).collection('ratings').doc('movie_105')
    await rating.set({ tmdbId: 105, mediaType: 'movie', score: 6 })
    await rating.update({ score: 10 })
    const newest = await waitFor(() => current(uid), (value) => (
      value?.dimensions?.mediaTypes?.[0]?.signedContribution === 1
    ))
    const updatedAt = newest.updatedAt.toMillis()

    await rating.set({ tmdbId: 105, mediaType: 'movie', score: 10 })
    await waitFor(
      async () => (await db.collection('users').doc(uid).collection('movieDna').doc('recalculation').get()).data(),
      (value) => value?.status === 'succeeded',
    )
    assert.equal((await current(uid)).updatedAt.toMillis(), updatedAt)
  })
})
