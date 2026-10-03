import { createHash } from 'node:crypto'

import { FieldValue, Timestamp } from 'firebase-admin/firestore'

import { MANUAL_REFRESH_COOLDOWN_MS } from '../config.js'
import { MOVIEDNA_ALGORITHM_VERSION } from '../dna/core/movieDnaConstants.js'
import { MovieDnaServerError, SERVER_ERROR_CODES } from '../errors.js'

function documents(snapshot) {
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value?.toMillis instanceof Function) return value.toMillis()
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  }
  return value
}

function revision(snapshot) {
  return createHash('sha256').update(JSON.stringify(canonical(snapshot))).digest('hex')
}

export function createFirestoreAdapter(db, { now = () => Date.now() } = {}) {
  const user = (uid) => db.collection('users').doc(uid)

  async function loadSources(uid) {
    const reference = user(uid)
    const [profile, ratings, responses, summary, savedMedia] = await Promise.all([
      reference.get(),
      reference.collection('ratings').get(),
      reference.collection('onboardingResponses').get(),
      reference.collection('onboarding').doc('summary').get(),
      reference.collection('savedMedia').where('favorite', '==', true).get(),
    ])
    const snapshot = {
      uid,
      profile: profile.exists ? profile.data() : null,
      ratings: documents(ratings),
      onboardingResponses: documents(responses),
      onboardingSummary: summary.exists ? summary.data() : null,
      savedMedia: documents(savedMedia),
    }
    return { snapshot, revision: revision(snapshot) }
  }

  async function loadRecommendationContext(uid) {
    const reference = user(uid)

    const [
      dna,
      ratings,
      watchedSavedMedia,
      viewingHistory,
      onboardingResponses,
    ] = await Promise.all([
      reference.collection('movieDna').doc('current').get(),
      reference.collection('ratings').get(),
      reference.collection('savedMedia').where('watched', '==', true).get(),
      reference.collection('viewingHistory').get(),
      reference.collection('onboardingResponses').get(),
    ])

    const watchedByKey = new Map()

    const addWatched = item => {
      if (
        !item
        || !['movie', 'tv'].includes(item.mediaType)
        || !Number.isSafeInteger(item.tmdbId)
        || item.tmdbId <= 0
      ) return

      watchedByKey.set(
        `${item.mediaType}_${item.tmdbId}`,
        {
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
        },
      )
    }

    for (const item of documents(watchedSavedMedia)) {
      addWatched(item)
    }

    for (const item of documents(viewingHistory)) {
      addWatched(item)
    }

    for (const item of documents(onboardingResponses)) {
      if (item.reaction === 'like' || item.reaction === 'dislike') {
        addWatched(item)
      }
    }

    return {
      dna: dna.exists ? dna.data() : null,
      rated: documents(ratings).map((rating) => ({
        tmdbId: rating.tmdbId,
        mediaType: rating.mediaType,
      })),
      watched: [...watchedByKey.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => value),
    }
  }

  const cache = {
    async get(mediaKey) {
      const snapshot = await db.collection('mediaSignals').doc(mediaKey).get()
      if (!snapshot.exists) return null
      const data = snapshot.data()
      return {
        ...data,
        fetchedAt: data.fetchedAt?.toMillis?.() ?? data.fetchedAt,
        expiresAt: data.expiresAt?.toMillis?.() ?? data.expiresAt,
      }
    },
    async set(mediaKey, value) {
      await db.collection('mediaSignals').doc(mediaKey).set({
        ...value,
        fetchedAt: Timestamp.fromMillis(value.fetchedAt),
        expiresAt: Timestamp.fromMillis(value.expiresAt),
      })
    },
  }

  async function beginRun(uid, runToken, { manual = false } = {}) {
    const stateRef = user(uid).collection('movieDna').doc('recalculation')
    await db.runTransaction(async (transaction) => {
      const state = await transaction.get(stateRef)
      const nextEligibleAt = state.data()?.nextEligibleAt?.toMillis?.() ?? 0
      if (manual && nextEligibleAt > now()) {
        throw new MovieDnaServerError(SERVER_ERROR_CODES.COOLDOWN)
      }
      transaction.set(stateRef, {
        schemaVersion: 1,
        status: 'running',
        requestedAt: FieldValue.serverTimestamp(),
        startedAt: FieldValue.serverTimestamp(),
        completedAt: null,
        nextEligibleAt: Timestamp.fromMillis(now() + MANUAL_REFRESH_COOLDOWN_MS),
        algorithmVersion: MOVIEDNA_ALGORITHM_VERSION,
        inputFingerprint: null,
        errorCode: null,
        runToken,
      })
    })
  }

  async function finishRun(uid, runToken, calculation) {
    const dnaRef = user(uid).collection('movieDna').doc('current')
    const stateRef = user(uid).collection('movieDna').doc('recalculation')
    return db.runTransaction(async (transaction) => {
      const [state, current] = await Promise.all([transaction.get(stateRef), transaction.get(dnaRef)])
      if (state.data()?.runToken !== runToken) throw new MovieDnaServerError(SERVER_ERROR_CODES.STALE_RUN)
      const unchanged = current.exists
        && current.data().algorithmVersion === calculation.algorithmVersion
        && current.data().inputFingerprint === calculation.inputFingerprint
      if (!unchanged) {
        transaction.set(dnaRef, {
          schemaVersion: 1,
          status: calculation.sourceCounts.uniqueNonZeroUsed ? 'ready' : 'insufficient-data',
          algorithmVersion: calculation.algorithmVersion,
          inputFingerprint: calculation.inputFingerprint,
          sourceCounts: calculation.sourceCounts,
          metadataCoverage: calculation.metadataCoverage,
          confidence: calculation.overallConfidence,
          dimensions: calculation.dimensions,
          calculatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
      transaction.update(stateRef, {
        status: 'succeeded',
        completedAt: FieldValue.serverTimestamp(),
        inputFingerprint: calculation.inputFingerprint,
        errorCode: null,
      })
      return unchanged
    })
  }

  async function failRun(uid, runToken, errorCode) {
    const stateRef = user(uid).collection('movieDna').doc('recalculation')
    await db.runTransaction(async (transaction) => {
      const state = await transaction.get(stateRef)
      if (state.data()?.runToken !== runToken) return
      transaction.update(stateRef, {
        status: 'failed',
        completedAt: FieldValue.serverTimestamp(),
        errorCode,
      })
    })
  }

  return {
    loadSources,
    loadRecommendationContext,
    cache,
    beginRun,
    finishRun,
    failRun,
  }
}
