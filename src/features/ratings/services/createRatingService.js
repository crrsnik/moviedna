import { getMediaKey } from '../../library/validation/libraryValidation.js'
import { ratingMediaSnapshot, validateScore, validateRatingKey } from '../validation/ratingValidation.js'
import { normalizeRating, normalizeUserRatings } from './normalizeRating.js'
import { RatingError, toRatingError } from './ratingErrors.js'

// Only this injected boundary knows Firestore. It never touches savedMedia.
export function createRatingService({ auth, db, doc, collection, onSnapshot, runTransaction, serverTimestamp }) {
  const pending = new Map(), subscriptions = new Map()
  function owner(uid, session = auth.currentUser) {
    if (typeof uid !== 'string' || !uid || uid.includes('/') || !session || session.uid !== uid) throw new RatingError('unauthenticated')
    if (auth.currentUser !== session) throw new RatingError('session')
    return session
  }
  const ref = (uid, key) => doc(db, 'users', uid, 'ratings', key)
  function subscribe(uid, target, normalize, next, error) {
    let active = true, generation = 0, stop = () => {}
    const session = auth.currentUser
    const connect = () => {
      if (!active) return
      const current = ++generation
      stop()
      const fail = e => { if (active && generation === current) error(toRatingError(e)) }
      try {
        owner(uid, session)
        stop = onSnapshot(target(), { includeMetadataChanges: true }, snapshot => {
          if (!active || current !== generation) return
          try {
            owner(uid, session)
            // Query-local removals can have hasPendingWrites=false; hold all UID snapshots too.
            if ([...pending.values()].includes(uid) || snapshot.metadata?.hasPendingWrites || snapshot.metadata?.fromCache) return
            next(normalize(snapshot))
          } catch (e) { fail(e) }
        }, fail)
      } catch (e) { fail(e) }
    }
    if (!subscriptions.has(uid)) subscriptions.set(uid, new Set())
    subscriptions.get(uid).add(connect); connect()
    return () => {
      active = false; generation++; stop()
      subscriptions.get(uid)?.delete(connect)
      if (!subscriptions.get(uid)?.size) subscriptions.delete(uid)
    }
  }
  async function mutate(uid, key, operation) {
    let lock
    try {
      const session = owner(uid)
      validateRatingKey(key)
      const candidate = `${uid}:${key}`
      if (pending.has(candidate)) throw new RatingError('pending')
      lock = candidate; pending.set(lock, uid)
      await runTransaction(db, async tx => {
        owner(uid, session)
        await operation(tx, ref(uid, key), session)
      })
      // A dispatched server commit cannot be cancelled at logout; never report success to a new session.
      owner(uid, session)
    } catch (e) { throw toRatingError(e) }
    finally {
      if (lock) {
        pending.delete(lock)
        for (const refresh of subscriptions.get(uid) ?? []) refresh()
      }
    }
  }
  return {
    subscribeToRating(uid, key, next, error) {
      return subscribe(uid, () => ref(uid, validateRatingKey(key)), snapshot => snapshot.exists() ? normalizeRating(snapshot) : null, next, error)
    },
    subscribeToUserRatings(uid, next, error) {
      return subscribe(uid, () => collection(db, 'users', uid, 'ratings'), normalizeUserRatings, next, error)
    },
    async saveRating(uid, input, score) {
      owner(uid)
      const media = ratingMediaSnapshot(input)
      validateScore(score)
      const key = getMediaKey(media.mediaType, media.tmdbId)
      return mutate(uid, key, async (tx, target, session) => {
        const profile = await tx.get(doc(db, 'users', uid))
        owner(uid, session)
        if (!profile.exists() || typeof profile.data()?.onboardingCompleted !== 'boolean') throw new RatingError('incomplete-profile')
        const existing = await tx.get(target)
        owner(uid, session)

        const savedMediaRef = doc(
          db,
          'users',
          uid,
          'savedMedia',
          key,
        )

        const savedMedia = await tx.get(savedMediaRef)
        owner(uid, session)

        if (existing.exists()) {
          const saved = normalizeRating(existing)
          if (saved.key !== key) throw new RatingError('identity-mismatch')
          tx.update(target, {
            title: media.title,
            posterPath: media.posterPath,
            releaseYear: media.releaseYear,
            score,
            updatedAt: serverTimestamp(),
          })
        } else {
          tx.set(target, {
            ...media,
            score,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }

        if (savedMedia.exists()) {
          tx.update(savedMediaRef, {
            title: media.title,
            posterPath: media.posterPath,
            releaseYear: media.releaseYear,
            watched: true,
            updatedAt: serverTimestamp(),
          })
        } else {
          tx.set(savedMediaRef, {
            ...media,
            favorite: false,
            watchlist: false,
            watched: true,
            listIds: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
      })
    },
    deleteRating(uid, key) {
      return mutate(uid, key, async (tx, target, session) => {
        const existing = await tx.get(target)
        owner(uid, session)
        if (existing.exists()) tx.delete(target)
      })
    },
  }
}
