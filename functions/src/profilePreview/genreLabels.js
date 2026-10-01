const GENRES = new Map([
  [12, 'Adventure'],
  [14, 'Fantasy'],
  [16, 'Animation'],
  [18, 'Drama'],
  [27, 'Horror'],
  [28, 'Action'],
  [35, 'Comedy'],
  [36, 'History'],
  [37, 'Western'],
  [53, 'Thriller'],
  [80, 'Crime'],
  [99, 'Documentary'],
  [878, 'Science Fiction'],
  [9648, 'Mystery'],
  [10402, 'Music'],
  [10749, 'Romance'],
  [10751, 'Family'],
  [10752, 'War'],
  [10759, 'Action & Adventure'],
  [10762, 'Kids'],
  [10763, 'News'],
  [10764, 'Reality'],
  [10765, 'Sci-Fi & Fantasy'],
  [10766, 'Soap'],
  [10767, 'Talk'],
  [10768, 'War & Politics'],
  [10770, 'TV Movie'],
])

export function resolvePublicGenreLabel(entry) {
  if (!entry || typeof entry !== 'object') return null

  if (
    typeof entry.key === 'string'
    && entry.key.startsWith('genre:')
  ) {
    const id = Number(entry.key.slice('genre:'.length))

    if (Number.isSafeInteger(id)) {
      return GENRES.get(id) ?? null
    }
  }

  /*
   * Defensive fallback for legacy/pre-normalized DNA documents.
   * Never use a numeric raw label as the public display value.
   */
  if (
    typeof entry.label === 'string'
    && entry.label.trim()
    && !/^\d+$/.test(entry.label.trim())
  ) {
    return entry.label.trim()
  }

  return null
}
