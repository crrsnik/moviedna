function validUid(value) {
  return (
    typeof value === 'string'
    && Boolean(value)
    && !value.includes('/')
  )
}

export function createMovieDnaSnapshotCache() {
  const entries = new Map()

  function get(uid) {
    if (!validUid(uid)) return null

    return entries.get(uid) ?? null
  }

  function set(uid, value) {
    if (!validUid(uid)) {
      throw new TypeError(
        'A valid MovieDNA owner is required.',
      )
    }

    if (
      !value
      || typeof value !== 'object'
    ) {
      throw new TypeError(
        'MovieDNA cache value must be an object.',
      )
    }

    entries.set(uid, value)

    return value
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

export const movieDnaSnapshotCache =
  createMovieDnaSnapshotCache()
