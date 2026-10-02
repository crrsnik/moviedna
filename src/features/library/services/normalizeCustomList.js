import {
  normalizeListInput,
  validateListId,
} from '../validation/customListValidation.js'
import { normalizeLibraryTimestamp } from './normalizeSavedMedia.js'
import { LibraryError } from './libraryErrors.js'

const REQUIRED_FIELDS = [
  'name',
  'description',
  'createdAt',
  'updatedAt',
]

const ALLOWED_FIELDS = [
  ...REQUIRED_FIELDS,
  'visibility',
  'pinned',
]

export function normalizeCustomList(snapshot) {
  try {
    const data = snapshot.data()
    const keys = data && typeof data === 'object'
      ? Object.keys(data)
      : []

    if (
      !data
      || !REQUIRED_FIELDS.every(key => Object.hasOwn(data, key))
      || !keys.every(key => ALLOWED_FIELDS.includes(key))
      || data.name.length > 60
      || data.description.length > 300
      || (
        data.pinned !== undefined
        && typeof data.pinned !== 'boolean'
      )
    ) throw new Error()

    const normalized = normalizeListInput({
      name: data.name,
      description: data.description,
      visibility: data.visibility ?? 'private',
    })

    return {
      id: validateListId(snapshot.id),
      ...normalized,
      pinned: data.pinned ?? false,
      createdAt: normalizeLibraryTimestamp(data.createdAt),
      updatedAt: normalizeLibraryTimestamp(data.updatedAt),
    }
  } catch {
    throw new LibraryError('invalid-list-data')
  }
}

export function normalizeCustomLists(snapshot) {
  return snapshot.docs
    .flatMap(doc => {
      try {
        return [normalizeCustomList(doc)]
      } catch {
        return []
      }
    })
    .sort((a, b) => (
      a.createdAt.seconds - b.createdAt.seconds
      || a.createdAt.nanoseconds - b.createdAt.nanoseconds
      || a.name.localeCompare(b.name, 'en')
      || a.id.localeCompare(b.id)
    ))
}
