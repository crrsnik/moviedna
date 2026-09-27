import { useLibrarySubscription } from './useLibrarySubscription.js'
export function useCustomListItems(uid, listId) {
  return useLibrarySubscription({ uid, listId, kind: 'items' })
}
