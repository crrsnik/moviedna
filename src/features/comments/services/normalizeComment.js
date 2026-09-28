import { normalizeLibraryTimestamp } from '../../library/services/normalizeSavedMedia.js'
import { commentIdentity, validateCommentInput } from '../validation/commentValidation.js'
import { CommentError } from './commentErrors.js'
const fields = ['tmdbId', 'mediaType', 'authorUsername', 'authorDisplayName', 'text', 'containsSpoiler', 'createdAt', 'updatedAt']
export function normalizeComment(snapshot, media) {
  try {
    const raw = snapshot.data(), identity = commentIdentity(media)
    if (!raw || Object.keys(raw).length !== fields.length || !fields.every(k => Object.hasOwn(raw, k))
      || typeof snapshot.id !== 'string' || !snapshot.id || snapshot.id.includes('/')) throw new Error()
    if (commentIdentity(raw).key !== identity.key) throw new CommentError('identity-mismatch')
    if (typeof raw.authorUsername !== 'string' || !/^[a-z0-9_]{3,20}$/.test(raw.authorUsername)
      || typeof raw.authorDisplayName !== 'string' || !raw.authorDisplayName.trim() || raw.authorDisplayName.length > 50
      || typeof raw.text !== 'string' || raw.text.length > 2000) throw new Error()
    const input = validateCommentInput(raw)
    return { id: snapshot.id, tmdbId: identity.tmdbId, mediaType: identity.mediaType,
      authorUsername: raw.authorUsername, authorDisplayName: raw.authorDisplayName, ...input,
      createdAt: normalizeLibraryTimestamp(raw.createdAt), updatedAt: normalizeLibraryTimestamp(raw.updatedAt) }
  } catch (error) {
    if (error?.code === 'identity-mismatch') throw error
    throw new CommentError('invalid-data')
  }
}
export function normalizeComments(snapshot, media) {
  return snapshot.docs.flatMap(doc => { try { return [normalizeComment(doc, media)] } catch { return [] } })
    .sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds || b.updatedAt.nanoseconds - a.updatedAt.nanoseconds || a.id.localeCompare(b.id)).slice(0, 20)
}
