function validUid(value) {
  return (
    typeof value === 'string'
    && Boolean(value)
    && !value.includes('/')
  )
}

export function createViewingHistorySnapshotCache() {
  const entries = new Map()

  function get(uid) {
    if (!validUid(uid)) return null

    return entries.get(uid) ?? null
  }

  function set(uid, data) {
    if (!validUid(uid)) {
      throw new TypeError(
        'A valid viewing history owner is required.',
      )
    }

    if (!Array.isArray(data)) {
      throw new TypeError(
        'Viewing history cache data must be an array.',
      )
    }

    entries.set(uid, data)

    return data
  }

  function clear(uid) {
    if (!validUid(uid)) return

    entries.delete(uid)
  }

  return Object.freeze({
    get,
    set,
    clear,
  })
}

export const viewingHistorySnapshotCache =
  createViewingHistorySnapshotCache()
