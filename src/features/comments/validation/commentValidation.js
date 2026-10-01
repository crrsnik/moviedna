import { getMediaKey } from '../../library/validation/libraryValidation.js'
import { normalizeLibraryTimestamp } from '../../library/services/normalizeSavedMedia.js'
import { CommentError } from '../services/commentErrors.js'
export function commentIdentity(media) {
  try { return { tmdbId: media.tmdbId, mediaType: media.mediaType, key: getMediaKey(media.mediaType, media.tmdbId) } }
  catch { throw new CommentError('invalid-media') }
}
export function validateCommentInput(input) {
  if (typeof input?.text !== 'string' || !input.text.trim() || input.text.trim().length > 2000) throw new CommentError('invalid-text')
  if (typeof input.containsSpoiler !== 'boolean') throw new CommentError('invalid-spoiler')
  return { text: input.text.trim(), containsSpoiler: input.containsSpoiler }
}
export function validateCommentProfile(uid, profile) {
  try {
    if (!profile || profile.id !== uid || typeof profile.onboardingCompleted !== 'boolean'
      || !/^[a-z0-9_]{3,20}$/.test(profile.username) || typeof profile.username !== 'string'
      || typeof profile.displayName !== 'string' || !profile.displayName.trim() || profile.displayName.length > 50
      || typeof profile.bio !== 'string' || !(profile.photoURL === null || typeof profile.photoURL === 'string')) throw new Error()
    normalizeLibraryTimestamp(profile.createdAt); normalizeLibraryTimestamp(profile.updatedAt)
    return { authorUsername: profile.username, authorDisplayName: profile.displayName }
  } catch { throw new CommentError('profile') }
}
