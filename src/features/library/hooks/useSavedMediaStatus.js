import { useLibrarySubscription } from './useLibrarySubscription.js'
export function useSavedMediaStatus(uid, media) {
  return useLibrarySubscription({ uid, mediaType: media.mediaType, tmdbId: media.tmdbId })
}
