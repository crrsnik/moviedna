import { LibraryError } from '../services/libraryErrors.js'
export function validateListId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{20}$/.test(id)) throw new LibraryError('invalid-list-id')
  return id
}
export function normalizeListInput(input) {
  if (!input || typeof input.name !== 'string' || typeof input.description !== 'string') throw new LibraryError('invalid-list-input')
  const name = input.name.trim(), description = input.description.trim()
  if (!name || name.length > 60 || description.length > 300) throw new LibraryError('invalid-list-input')
  return { name, description }
}
export function validateSelectedListIds(ids) {
  if (!Array.isArray(ids)) throw new LibraryError('invalid-list-id')
  if (ids.length > 20) throw new LibraryError('membership-limit')
  ids.forEach(validateListId)
  if (new Set(ids).size !== ids.length) throw new LibraryError('invalid-list-id')
  return [...ids]
}
export function normalizeLibrarySelection(params) {
  const view = params.get('view')
  if (view === 'list') {
    try { return { view, listId: validateListId(params.get('listId')) } } catch { /* Invalid URL falls back to Favorites. */ }
  }
  return { view: view === 'watchlist' ? 'watchlist' : 'favorites' }
}
export function librarySelectionParams(selection) {
  return new URLSearchParams(normalizeLibrarySelection(new URLSearchParams(selection)))
}
