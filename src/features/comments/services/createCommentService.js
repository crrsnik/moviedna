import { commentIdentity, validateCommentInput, validateCommentProfile } from '../validation/commentValidation.js'
import { normalizeComment, normalizeComments } from './normalizeComment.js'
import { CommentError, toCommentError } from './commentErrors.js'

export function createCommentService({ auth, db, doc, collection, query, orderBy, limit, onSnapshot, runTransaction, serverTimestamp }) {
  const pending = new Map(), subscriptions = new Map()
  function owner(uid, session = auth.currentUser) {
    if (!session || typeof uid !== 'string' || !uid || uid.includes('/') || session.uid !== uid) throw new CommentError('unauthenticated')
    if (session !== auth.currentUser) throw new CommentError('session')
    return session
  }
  const ref = (key, uid) => doc(db, 'mediaComments', key, 'comments', uid)
  function subscribe(media, uid, { next, error }) {
    let identity
    try { identity = commentIdentity(media); if (uid !== null) owner(uid) } catch (e) { error(toCommentError(e)); return () => {} }
    const session = auth.currentUser, key = identity.key
    let active = true, generation = 0, stop = () => {}
    const connect = () => {
      if (!active) return
      const current = ++generation
      stop()
      const fail = e => { if (active && generation === current) error(toCommentError(e)) }
      try {
        if (uid !== null) owner(uid, session)
        const target = uid === null ? query(collection(db, 'mediaComments', key, 'comments'), orderBy('updatedAt', 'desc'), limit(20)) : ref(key, uid)
        stop = onSnapshot(target, { includeMetadataChanges: true }, snapshot => {
          if (!active || current !== generation) return
          try {
            if (uid !== null) owner(uid, session)
            // Local query deletions may not carry hasPendingWrites: hold the whole media list.
            if ([...pending.values()].includes(key) || snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites) return
            next(uid === null ? normalizeComments(snapshot, identity) : snapshot.exists() ? normalizeComment(snapshot, identity) : null)
          } catch (e) { fail(e) }
        }, fail)
      } catch (e) { fail(e) }
    }
    if (!subscriptions.has(key)) subscriptions.set(key, new Set())
    subscriptions.get(key).add(connect); connect()
    return () => { active = false; generation++; stop(); subscriptions.get(key)?.delete(connect); if (!subscriptions.get(key)?.size) subscriptions.delete(key) }
  }
  async function mutate(uid, media, operation) {
    let lock, key
    try {
      const session = owner(uid), identity = commentIdentity(media)
      key = identity.key
      const candidate = `${uid}:${key}`
      if (pending.has(candidate)) throw new CommentError('pending')
      lock = candidate; pending.set(lock, key)
      await runTransaction(db, async tx => {
        owner(uid, session)
        const profile = await tx.get(doc(db, 'users', uid))
        owner(uid, session)
        if (!profile.exists()) throw new CommentError('profile')
        const author = validateCommentProfile(uid, { ...profile.data(), id: profile.id })
        const target = ref(key, uid), existing = await tx.get(target)
        owner(uid, session)
        const saved = existing.exists() ? normalizeComment(existing, identity) : null
        if (saved && saved.id !== uid) throw new CommentError('identity-mismatch')
        operation(tx, target, saved, author, identity)
      })
      // A commit already dispatched cannot be guaranteed cancelled by logout.
      owner(uid, session)
    } catch (e) { throw toCommentError(e) }
    finally {
      if (lock) { pending.delete(lock); for (const connect of subscriptions.get(key) ?? []) connect() }
    }
  }
  return {
    subscribeToMediaComments(media, callbacks) { return subscribe(media, null, callbacks) },
    subscribeToOwnComment(uid, media, callbacks) {
      // null is reserved for public subscriptions and must never turn a guest into an own read.
      try { owner(uid) } catch (e) { callbacks.error(toCommentError(e)); return () => {} }
      return subscribe(media, uid, callbacks)
    },
    async saveComment(uid, profile, media, input) {
      owner(uid); const author = validateCommentProfile(uid, profile), validated = validateCommentInput(input)
      return mutate(uid, media, (tx, target, saved, confirmedAuthor, identity) => {
        if (author.authorUsername !== confirmedAuthor.authorUsername || author.authorDisplayName !== confirmedAuthor.authorDisplayName) throw new CommentError('profile')
        if (saved) tx.update(target, { ...validated, updatedAt: serverTimestamp() })
        else tx.set(target, { tmdbId: identity.tmdbId, mediaType: identity.mediaType, ...confirmedAuthor, ...validated, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      })
    },
    deleteComment(uid, media) { return mutate(uid, media, (tx, target, saved) => { if (saved) tx.delete(target) }) },
  }
}
