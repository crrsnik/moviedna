import { useLibrarySubscription } from './useLibrarySubscription.js'
export function useCustomLists(uid) {
  return useLibrarySubscription({ uid, kind: 'lists' })
}
