const DEFAULT_TTL_MS = 5 * 60 * 1000

export function createTrendingCatalogCache({
  ttlMs = DEFAULT_TTL_MS,
  now = () => Date.now(),
} = {}) {
  const entries = new Map()

  function key(type, language) {
    return `${type}:${language}`
  }

  function get(type, language) {
    const entry = entries.get(
      key(type, language),
    )

    if (!entry) return null

    return {
      data: entry.data,
      fresh: now() - entry.savedAt < ttlMs,
    }
  }

  function set(type, language, data) {
    if (!Array.isArray(data)) {
      throw new TypeError(
        'Trending catalog cache data must be an array.',
      )
    }

    entries.set(
      key(type, language),
      {
        data,
        savedAt: now(),
      },
    )

    return data
  }

  function clear() {
    entries.clear()
  }

  return Object.freeze({
    get,
    set,
    clear,
  })
}

export const trendingCatalogCache =
  createTrendingCatalogCache()
