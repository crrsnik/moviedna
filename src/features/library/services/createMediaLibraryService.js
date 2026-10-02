import { customListOperations } from './customListOperations.js'
import { getMediaKey, normalizeMediaSnapshot, normalizeLibraryView } from '../validation/libraryValidation.js'
import { normalizeSavedMedia, normalizeLibraryItems } from './normalizeSavedMedia.js'
import { LibraryError, toLibraryError } from './libraryErrors.js'

// Inject only the Firebase boundary. Unit tests never initialize or contact Firebase.
export function createMediaLibraryService({ auth, db, doc, collection, query, where, onSnapshot, runTransaction, serverTimestamp, getDocsFromServer, limit }) {
  const pending = new Map()
  const subscriptions = new Map()
  const deleting = new Set()
  function requireOwner(uid, session = auth.currentUser) {
    if (typeof uid !== 'string' || !uid || uid.includes('/') || !session || session.uid !== uid) throw new LibraryError('unauthenticated')
    if (auth.currentUser !== session) throw new LibraryError('session')
    return session
  }
  const ref = (uid, key) => doc(db, 'users', uid, 'savedMedia', key)
  function subscribe(uid, target, normalize, next, error) {
    let active = true, stop = () => {}, generation = 0
    const session = auth.currentUser
    const fail = value => { if (active) error(toLibraryError(value)) }
    const connect = () => {
      const ownGeneration = ++generation
      stop()
      try {
        requireOwner(uid, session)
        stop = onSnapshot(target(), { includeMetadataChanges: true }, snapshot => {
          if (!active || ownGeneration !== generation) return
          try {
            requireOwner(uid, session)
            // Local query removals may have no pending document left in the result.
            if ([...pending.values()].includes(uid) || snapshot.metadata?.hasPendingWrites || snapshot.metadata?.fromCache) return
            next(normalize(snapshot))
          } catch (e) { fail(e) }
        }, value => { if (ownGeneration === generation) fail(value) })
      } catch (e) { fail(e) }
    }
    if (!subscriptions.has(uid)) subscriptions.set(uid, new Set())
    subscriptions.get(uid).add(connect)
    connect()
    return () => {
      active = false; generation++; stop()
      subscriptions.get(uid)?.delete(connect)
      if (!subscriptions.get(uid)?.size) subscriptions.delete(uid)
    }
  }
  function subscribeToSavedMedia({ uid, mediaType, tmdbId }, next, error) {
    return subscribe(uid, () => ref(uid, getMediaKey(mediaType, tmdbId)), snap => snap.exists() ? normalizeSavedMedia(snap) : null, next, error)
  }

  function subscribeToWatchedMedia(uid, next, error) {
    return subscribe(
      uid,
      () => query(
        collection(db, 'users', uid, 'savedMedia'),
        where('watched', '==', true),
      ),
      normalizeLibraryItems,
      next,
      error,
    )
  }

  function subscribeToLibrary({ uid, view }, next, error) {
    const field = normalizeLibraryView(view) === 'favorites' ? 'favorite' : 'watchlist'
    return subscribe(uid, () => query(collection(db, 'users', uid, 'savedMedia'), where(field, '==', true)), normalizeLibraryItems, next, error)
  }
  async function changeMembership({ uid, media, field, enabled }) {
    let lock
    try {
      const session = requireOwner(uid)
      const snapshot = normalizeMediaSnapshot(media), key = getMediaKey(snapshot.mediaType, snapshot.tmdbId)
      if (!['favorite', 'watchlist'].includes(field) || (enabled !== undefined && typeof enabled !== 'boolean')) throw new LibraryError('invalid-media')
      if (deleting.has(uid)) throw new LibraryError('concurrent-deletion')
      const candidate = `${uid}:${key}`
      if (pending.has(candidate)) throw new LibraryError('pending')
      lock = candidate; pending.set(lock, uid)
      const target = ref(uid, key)
      await runTransaction(db, async tx => {
        requireOwner(uid, session)
        const existing = await tx.get(target)
        requireOwner(uid, session)
        const saved = existing.exists() ? normalizeSavedMedia(existing) : null
        if (saved && (saved.tmdbId !== snapshot.tmdbId || saved.mediaType !== snapshot.mediaType)) throw new LibraryError('invalid-data')
        const value = enabled ?? !saved?.[field]
        if (!saved && !value) return
        const favorite = field === 'favorite' ? value : saved?.favorite ?? false
        const watchlist = field === 'watchlist' ? value : saved?.watchlist ?? false
        const watched = saved?.watched ?? false
        const listIds = saved?.listIds ?? []

        if (!favorite && !watchlist && !watched && !listIds.length) tx.delete(target)
        else if (saved) tx.update(target, { title: snapshot.title, posterPath: snapshot.posterPath, releaseYear: snapshot.releaseYear, [field]: value, watched, updatedAt: serverTimestamp() })
        else tx.set(target, { ...snapshot, favorite, watchlist, watched: false, listIds, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      })
      // An already-dispatched commit cannot be cancelled; never apply it to a new session's UI.
      requireOwner(uid, session)
    } catch (e) { throw toLibraryError(e) }
    finally {
      if (lock) {
        pending.delete(lock)
        // Reattach after acknowledgement/failure; never replay a mutation on Retry.
        for (const refresh of subscriptions.get(uid) ?? []) refresh()
      }
    }
  }
  async function mutate(uid, key, operation, deletion = false) {
    let lock
    try {
      const session = requireOwner(uid)
      if (deleting.has(uid)) throw new LibraryError('concurrent-deletion')
      if (deletion && [...pending.values()].includes(uid)) throw new LibraryError('pending')
      const candidate = `${uid}:${key}`
      if (pending.has(candidate)) throw new LibraryError('pending')
      lock = candidate; pending.set(lock, uid)
      if (deletion) deleting.add(uid)
      const result = await operation(session)
      requireOwner(uid, session)
      return result
    } catch (error) { throw toLibraryError(error) }
    finally {
      if (lock) {
        pending.delete(lock)
        if (deletion) deleting.delete(uid)
        for (const refresh of subscriptions.get(uid) ?? []) refresh()
      }
    }
  }
  const custom = customListOperations({ db, doc, collection, query, where, limit, getDocsFromServer, runTransaction, serverTimestamp, requireOwner, subscribe, mutate, ref })
  return {
    ...custom,
    subscribeToSavedMedia,
    subscribeToWatchedMedia,
    subscribeToLibrary,
    toggleFavorite: options => changeMembership({ ...options, field: 'favorite' }),
    toggleWatchlist: options => changeMembership({ ...options, field: 'watchlist' }),
    removeFromView: options => changeMembership({ ...options, field: normalizeLibraryView(options.view) === 'favorites' ? 'favorite' : 'watchlist', enabled: false }) }
}
