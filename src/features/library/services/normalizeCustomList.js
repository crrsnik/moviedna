import { normalizeListInput, validateListId } from '../validation/customListValidation.js'
import { normalizeLibraryTimestamp } from './normalizeSavedMedia.js'
import { LibraryError } from './libraryErrors.js'
export function normalizeCustomList(snapshot) {
  try {
    const data = snapshot.data()
    if (!data || Object.keys(data).length !== 4 || !['name', 'description', 'createdAt', 'updatedAt'].every(key => Object.hasOwn(data, key)) || data.name.length > 60 || data.description.length > 300) throw new Error()
    return { id: validateListId(snapshot.id), ...normalizeListInput(data), createdAt: normalizeLibraryTimestamp(data.createdAt), updatedAt: normalizeLibraryTimestamp(data.updatedAt) }
  } catch { throw new LibraryError('invalid-list-data') }
}
export function normalizeCustomLists(snapshot) {
  return snapshot.docs.flatMap(doc => { try { return [normalizeCustomList(doc)] } catch { return [] } })
    .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds || a.createdAt.nanoseconds - b.createdAt.nanoseconds || a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id))
}
