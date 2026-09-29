const GENRES = new Map([
  [12, 'Adventure'], [14, 'Fantasy'], [16, 'Animation'], [18, 'Drama'], [27, 'Horror'],
  [28, 'Action'], [35, 'Comedy'], [36, 'History'], [37, 'Western'], [53, 'Thriller'],
  [80, 'Crime'], [99, 'Documentary'], [878, 'Science Fiction'], [9648, 'Mystery'],
  [10402, 'Music'], [10749, 'Romance'], [10751, 'Family'], [10752, 'War'],
  [10759, 'Action & Adventure'], [10762, 'Kids'], [10763, 'News'], [10764, 'Reality'],
  [10765, 'Sci-Fi & Fantasy'], [10766, 'Soap'], [10767, 'Talk'],
  [10768, 'War & Politics'], [10770, 'TV Movie'],
])

function displayName(type, code, fallback) {
  try {
    return new Intl.DisplayNames(['en'], { type, fallback: 'none' }).of(code) ?? fallback
  } catch {
    return fallback
  }
}

function keyValue(key, prefix) {
  return key.startsWith(prefix) ? key.slice(prefix.length) : null
}

function personLabel(label, fallback) {
  return /^\d+$/.test(label) ? fallback : label
}

export function resolveDimensionLabel(dimension, entry) {
  const stored = entry.label.trim()
  if (dimension === 'genres') {
    const id = Number(keyValue(entry.key, 'genre:'))
    return GENRES.get(id) ?? 'Unknown genre'
  }
  if (dimension === 'mediaTypes') {
    return { movie: 'Movies', tv: 'TV' }[keyValue(entry.key, 'media:')] ?? stored
  }
  if (dimension === 'decades') {
    const decade = keyValue(entry.key, 'decade:')
    return /^\d{4}$/.test(decade ?? '') ? `${decade}s` : stored
  }
  if (dimension === 'languages') {
    const code = keyValue(entry.key, 'language:')
    return /^[a-z]{2}$/.test(code ?? '') ? displayName('language', code, 'Unknown language') : 'Unknown language'
  }
  if (dimension === 'countries') {
    const code = keyValue(entry.key, 'country:')
    return /^[A-Z]{2}$/.test(code ?? '') ? displayName('region', code, 'Unknown country') : 'Unknown country'
  }
  if (dimension === 'directors') return personLabel(stored, 'Unknown director')
  if (dimension === 'creators') return personLabel(stored, 'Unknown creator')
  if (dimension === 'actors') return personLabel(stored, 'Unknown actor')
  return stored
}
