import { validateListId, normalizeListInput, validateSelectedListIds } from '../validation/customListValidation.js'
import { getMediaKey, normalizeMediaSnapshot } from '../validation/libraryValidation.js'
import { normalizeCustomList, normalizeCustomLists } from './normalizeCustomList.js'
import { normalizeSavedMedia, normalizeLibraryItems } from './normalizeSavedMedia.js'
import { LibraryError } from './libraryErrors.js'

// Part of the existing library service: shares session checks, locks and subscriptions.
export function customListOperations({ db, doc, collection, query, where, limit, getDocsFromServer, runTransaction, serverTimestamp, requireOwner, subscribe, mutate, ref }) {
  const lists = uid => collection(db, 'users', uid, 'lists')
  const listRef = (uid, id) => doc(db, 'users', uid, 'lists', id)
  const items = (uid, id, ...constraints) => query(collection(db, 'users', uid, 'savedMedia'), where('listIds', 'array-contains', id), ...constraints)
  function mediaKey(key) {
    const match = typeof key === 'string' && /^(movie|tv)_([1-9][0-9]*)$/.exec(key)
    if (!match || getMediaKey(match[1], Number(match[2])) !== key) throw new LibraryError('invalid-media')
    return key
  }
  function writeMembership(tx, target, saved, ids) {
    if (!saved.favorite && !saved.watchlist && !ids.length) tx.delete(target)
    else tx.update(target, { listIds: ids, updatedAt: serverTimestamp() })
  }
  async function remove(uid, key, id, session) {
    const target = ref(uid, key)
    await runTransaction(db, async tx => {
      requireOwner(uid, session)
      const snapshot = await tx.get(target)
      requireOwner(uid, session)
      if (!snapshot.exists()) return
      const saved = normalizeSavedMedia(snapshot)
      if (!saved.listIds.includes(id)) return
      writeMembership(tx, target, saved, saved.listIds.filter(value => value !== id))
    })
  }
  return {
    subscribeToCustomLists(uid, next, error) {
      return subscribe(uid, () => lists(uid), normalizeCustomLists, next, error)
    },
    subscribeToCustomListItems(uid, id, next, error) {
      return subscribe(uid, () => items(uid, validateListId(id)), normalizeLibraryItems, next, error)
    },
    createCustomList(uid, input) {
      return mutate(uid, 'create-list', async session => {
        const data = normalizeListInput(input)
        const target = doc(lists(uid))
        validateListId(target.id)
        await runTransaction(db, async tx => {
          requireOwner(uid, session)
          tx.set(target, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        })
        return target.id
      })
    },
    updateCustomList(uid, id, input) {
      return mutate(uid, `list:${id}`, async session => {
        validateListId(id)
        const data = normalizeListInput(input), target = listRef(uid, id)
        await runTransaction(db, async tx => {
          requireOwner(uid, session)
          const snapshot = await tx.get(target)
          requireOwner(uid, session)
          if (!snapshot.exists()) throw new LibraryError('list-not-found')
          normalizeCustomList(snapshot)
          tx.update(target, { ...data, updatedAt: serverTimestamp() })
        })
      })
    },
    updateMediaListMemberships(uid, media, selectedListIds) {
      // Use the same media lock as Favorites/Watchlist.
      let snapshot, ids, key
      try { snapshot = normalizeMediaSnapshot(media); ids = validateSelectedListIds(selectedListIds); key = getMediaKey(snapshot.mediaType, snapshot.tmdbId) }
      catch (error) { return Promise.reject(error) }
      return mutate(uid, key, async session => {
        const target = ref(uid, key)
        await runTransaction(db, async tx => {
          requireOwner(uid, session)
          const existing = await tx.get(target)
          requireOwner(uid, session)
          const saved = existing.exists() ? normalizeSavedMedia(existing) : null
          // All reads precede writes. Recheck every selected list, including existing memberships.
          for (const id of ids) {
            const list = await tx.get(listRef(uid, id))
            requireOwner(uid, session)
            if (!list.exists()) throw new LibraryError('list-not-found')
            normalizeCustomList(list)
          }
          if (!saved && !ids.length) return
          if (saved) {
            if (!saved.favorite && !saved.watchlist && !ids.length) tx.delete(target)
            else tx.update(target, { title: snapshot.title, posterPath: snapshot.posterPath, releaseYear: snapshot.releaseYear, listIds: ids, updatedAt: serverTimestamp() })
          } else tx.set(target, { ...snapshot, favorite: false, watchlist: false, listIds: ids, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        })
      })
    },
    removeMediaFromCustomList(uid, key, id) {
      return mutate(uid, key, async session => {
        validateListId(id); mediaKey(key)
        await remove(uid, key, id, session)
      })
    },
    deleteCustomList(uid, id) {
      return mutate(uid, `list:${id}`, async session => {
        validateListId(id)
        try {
          // Bounded reads and one transaction per document. Retry resumes remaining work.
          for (let group = 0; group < 10; group++) {
            requireOwner(uid, session)
            const batch = await getDocsFromServer(items(uid, id, limit(100)))
            requireOwner(uid, session)
            if (!batch.docs.length) break
            for (const item of batch.docs) {
              mediaKey(item.id)
              await remove(uid, item.id, id, session)
            }
          }
          requireOwner(uid, session)
          const remaining = await getDocsFromServer(items(uid, id, limit(1)))
          requireOwner(uid, session)
          if (remaining.docs.length) throw new LibraryError('partial-cleanup')
          await runTransaction(db, async tx => {
            requireOwner(uid, session)
            const target = listRef(uid, id), snapshot = await tx.get(target)
            requireOwner(uid, session)
            if (snapshot.exists()) tx.delete(target)
          })
        } catch (error) {
          if (error instanceof LibraryError && ['session', 'unauthenticated'].includes(error.code)) throw error
          throw new LibraryError('partial-cleanup')
        }
      }, true)
    },
  }
}
