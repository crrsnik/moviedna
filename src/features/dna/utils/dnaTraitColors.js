const GENRE_COLORS = Object.freeze({
  // Movies
  28: '#ef6c4d',     // Action
  12: '#d99a32',     // Adventure
  16: '#f59e42',     // Animation
  35: '#eab839',     // Comedy
  80: '#64748b',     // Crime
  99: '#4e9f78',     // Documentary
  18: '#6874d8',     // Drama
  10751: '#55a89d',  // Family
  14: '#8b6bd6',     // Fantasy
  36: '#a17b59',     // History
  27: '#9b3d4f',     // Horror
  10402: '#bd65a5',  // Music
  9648: '#7868b3',   // Mystery
  10749: '#e56d9c',  // Romance
  878: '#4f86e8',    // Science Fiction
  53: '#6f63ba',     // Thriller
  10752: '#a95454',  // War
  37: '#a97945',     // Western

  // TV-specific TMDB genres
  10759: '#e47745',  // Action & Adventure
  10762: '#54a99a',  // Kids
  10763: '#5d88b5',  // News
  10764: '#c47b50',  // Reality
  10765: '#6876dd',  // Sci-Fi & Fantasy
  10766: '#d36e9c',  // Soap
  10767: '#8c78b7',  // Talk
  10768: '#a45c58',  // War & Politics
})

const GENRE_LABEL_COLORS = Object.freeze({
  action: '#ef6c4d',
  adventure: '#d99a32',
  animation: '#f59e42',
  comedy: '#eab839',
  crime: '#64748b',
  documentary: '#4e9f78',
  drama: '#6874d8',
  family: '#55a89d',
  fantasy: '#8b6bd6',
  history: '#a17b59',
  horror: '#9b3d4f',
  music: '#bd65a5',
  mystery: '#7868b3',
  romance: '#e56d9c',
  melodrama: '#e56d9c',
  'science fiction': '#4f86e8',
  'sci-fi': '#4f86e8',
  thriller: '#6f63ba',
  war: '#a95454',
  western: '#a97945',
})

const FALLBACK_PALETTE = Object.freeze([
  '#4f86e8',
  '#8b6bd6',
  '#d66c96',
  '#d99043',
  '#55a187',
  '#6c78c7',
  '#a66b9e',
  '#b37a52',
])

function stablePaletteIndex(value) {
  const text = String(value ?? '')
  let hash = 0

  for (const character of text) {
    hash = (
      (hash * 31)
      + character.codePointAt(0)
    ) >>> 0
  }

  return hash % FALLBACK_PALETTE.length
}

function normalizedLabel(label) {
  return String(label ?? '')
    .trim()
    .toLocaleLowerCase('en')
}

function mediaTypeColor(key, label) {
  const value = (
    `${String(key ?? '')} ${normalizedLabel(label)}`
  )

  if (
    value.includes('movie')
    || value.includes('film')
  ) {
    return '#3b82d0'
  }

  if (
    value.includes('tv')
    || value.includes('television')
    || value.includes('series')
  ) {
    return '#8a67cf'
  }

  return null
}

function genreColor(key, label) {
  const numericKey = Number(key)

  if (
    Number.isInteger(numericKey)
    && GENRE_COLORS[numericKey]
  ) {
    return GENRE_COLORS[numericKey]
  }

  const normalized = normalizedLabel(label)

  for (const [name, color] of Object.entries(
    GENRE_LABEL_COLORS,
  )) {
    if (normalized.includes(name)) {
      return color
    }
  }

  return null
}

export function getDnaTraitColor({
  dimension,
  key,
  label,
}) {
  if (dimension === 'mediaTypes') {
    const color = mediaTypeColor(key, label)
    if (color) return color
  }

  if (dimension === 'genres') {
    const color = genreColor(key, label)
    if (color) return color
  }

  const fallbackKey = (
    `${dimension}:${String(key ?? label ?? '')}`
  )

  return FALLBACK_PALETTE[
    stablePaletteIndex(fallbackKey)
  ]
}
