import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '../../../shared/config/firebase.js'
import { getOnboardingCounts, normalizeResponse, validateCompletionCounts, validateUid } from '../validation/onboardingValidation.js'
import { OnboardingError, toOnboardingError } from './onboardingErrors.js'

function requireOwner(uid) {
  validateUid(uid)
  if (!auth.currentUser || auth.currentUser.uid !== uid) throw new OnboardingError('unauthenticated')
}

function normalizeDocument(snapshot) {
  try {
    const data = snapshot.data()
    const fields = ['tmdbId', 'mediaType', 'reaction', 'genreIds', 'createdAt', 'updatedAt']
    if (!data || Object.keys(data).length !== fields.length || !fields.every((key) => Object.hasOwn(data, key))
      || snapshot.id !== String(data.tmdbId) || !(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp)) {
      throw new OnboardingError('invalid-data')
    }
    return { id: snapshot.id, ...normalizeResponse(data), createdAt: data.createdAt, updatedAt: data.updatedAt }
  } catch {
    throw new OnboardingError('invalid-data')
  }
}

function requireIncompleteProfile(snapshot) {
  if (!snapshot.exists() || typeof snapshot.data().onboardingCompleted !== 'boolean') throw new OnboardingError('invalid-data')
  if (snapshot.data().onboardingCompleted) throw new OnboardingError('already-completed')
}

export async function loadOnboardingResponses({ uid }) {
  try {
    requireOwner(uid)
    // Firestore reads are not abortable. The hook discards stale results instead.
    // Server-only reads keep completion counts independent of an offline cache.
    const snapshot = await getDocsFromServer(collection(db, 'users', uid, 'onboardingResponses'))
    requireOwner(uid)
    return snapshot.docs.map(normalizeDocument)
  } catch (error) { throw toOnboardingError(error) }
}

export async function saveOnboardingResponse({ uid, movie, reaction }) {
  try {
    requireOwner(uid)
    const response = normalizeResponse({ tmdbId: movie?.id, mediaType: movie?.mediaType, reaction, genreIds: movie?.genreIds })
    const ref = doc(db, 'users', uid, 'onboardingResponses', String(response.tmdbId))
    await runTransaction(db, async (transaction) => {
      requireOwner(uid)
      const profile = await transaction.get(doc(db, 'users', uid))
      requireIncompleteProfile(profile)
      const existing = await transaction.get(ref)
      requireOwner(uid)
      if (existing.exists()) {
        normalizeDocument(existing)
        transaction.update(ref, { reaction: response.reaction, genreIds: response.genreIds, updatedAt: serverTimestamp() })
      } else {
        transaction.set(ref, { ...response, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      }
    })
    return { id: String(response.tmdbId), ...response }
  } catch (error) { throw toOnboardingError(error) }
}

export async function completeOnboarding({ uid }) {
  try {
    requireOwner(uid)
    const responses = await loadOnboardingResponses({ uid })
    const profileRef = doc(db, 'users', uid)
    const summaryRef = doc(db, 'users', uid, 'onboarding', 'summary')
    const [profile, summary] = await Promise.all([getDocFromServer(profileRef), getDocFromServer(summaryRef)])
    requireOwner(uid)
    requireIncompleteProfile(profile)
    if (summary.exists()) throw new OnboardingError('already-completed')
    const counts = validateCompletionCounts(getOnboardingCounts(responses))
    const batch = writeBatch(db)
    batch.set(summaryRef, {
      version: 1, userId: uid, status: 'completed', ...counts,
      completedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    batch.update(profileRef, { onboardingCompleted: true, updatedAt: serverTimestamp() })
    await batch.commit()
    return counts
  } catch (error) { throw toOnboardingError(error) }
}
