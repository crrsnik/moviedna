function validKey(value) {
  return typeof value === 'string' && Boolean(value)
}

export function createRecommendationCache() {
  const entries = new Map()
  const pending = new Map()

  function requestKey(uid, revision) {
    return `${uid}\u0000${revision}`
  }

  function validate(uid, revision) {
    if (!validKey(uid) || !validKey(revision)) {
      throw new TypeError(
        'A recommendation owner and revision are required.',
      )
    }
  }

  function get(uid, revision) {
    validate(uid, revision)

    const entry = entries.get(uid)

    return entry?.revision === revision
      ? entry.data
      : null
  }

  function set(uid, revision, data) {
    validate(uid, revision)

    entries.set(uid, {
      revision,
      data,
    })

    return data
  }

  function clear(uid) {
    if (!validKey(uid)) {
      throw new TypeError(
        'A recommendation owner is required.',
      )
    }

    entries.delete(uid)

    for (const key of pending.keys()) {
      if (key.startsWith(`${uid}\u0000`)) {
        pending.delete(key)
      }
    }
  }

  function load(
    uid,
    revision,
    loader,
    { force = false } = {},
  ) {
    validate(uid, revision)

    if (typeof loader !== 'function') {
      throw new TypeError(
        'A recommendation loader is required.',
      )
    }

    const cached = get(uid, revision)

    if (!force && cached !== null) {
      return Promise.resolve(cached)
    }

    const key = requestKey(uid, revision)
    const existing = pending.get(key)

    if (existing) return existing

    const promise = Promise.resolve()
      .then(loader)
      .then(data => set(uid, revision, data))
      .finally(() => {
        if (pending.get(key) === promise) {
          pending.delete(key)
        }
      })

    pending.set(key, promise)

    return promise
  }

  return Object.freeze({
    get,
    set,
    clear,
    load,
  })
}

export const recommendationCache =
  createRecommendationCache()
