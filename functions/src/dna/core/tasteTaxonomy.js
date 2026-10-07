const TASTE_RULES = Object.freeze([
  {
    key: 'taste:psychological-thriller',
    label: 'Psychological Thriller',
    genresAny: [53, 9648],
    keywordsAny: [
      'psychological thriller',
      'psychology',
      'psychological',
      'paranoia',
      'obsession',
      'mind game',
      'unreliable narrator',
      'memory loss',
      'repressed memory',
    ],
  },
  {
    key: 'taste:crime-thriller',
    label: 'Crime Thriller',
    genresAll: [53, 80],
  },
  {
    key: 'taste:emotional-drama',
    label: 'Emotional Drama',
    genresAny: [18],
    keywordsAny: [
      'tearjerker',
      'grief',
      'bereavement',
      'loss of loved one',
      'family tragedy',
      'terminal illness',
      'cancer',
      'death of child',
      'death of parent',
      'death of spouse',
    ],
  },
  {
    key: 'taste:philosophical-sci-fi',
    label: 'Philosophical Sci-Fi',
    genresAny: [878, 10765],
    keywordsAny: [
      'philosophy',
      'existentialism',
      'consciousness',
      'meaning of life',
      'humanity',
      'identity',
      'simulation',
      'nature of reality',
      'alternate reality',
    ],
  },
  {
    key: 'taste:dystopian-sci-fi',
    label: 'Dystopian Sci-Fi',
    genresAny: [878, 10765],
    keywordsAny: [
      'dystopia',
      'dystopian future',
      'totalitarian regime',
      'authoritarianism',
      'surveillance',
    ],
  },
  {
    key: 'taste:space-sci-fi',
    label: 'Space Sci-Fi',
    genresAny: [878, 10765],
    keywordsAny: [
      'space',
      'outer space',
      'space travel',
      'space mission',
      'astronaut',
      'spaceship',
      'alien',
      'alien planet',
    ],
  },
  {
    key: 'taste:coming-of-age',
    label: 'Coming of Age',
    genresAny: [18, 35],
    keywordsAny: [
      'coming of age',
      'adolescence',
      'teenager',
      'teenage life',
      'growing up',
      'first love',
    ],
  },
  {
    key: 'taste:dark-comedy',
    label: 'Dark Comedy',
    genresAny: [35],
    keywordsAny: [
      'dark comedy',
      'black comedy',
      'black humor',
    ],
  },
  {
    key: 'taste:slasher',
    label: 'Slasher',
    genresAny: [27],
    keywordsAny: [
      'slasher',
      'masked killer',
      'final girl',
    ],
  },
  {
    key: 'taste:supernatural-horror',
    label: 'Supernatural Horror',
    genresAny: [27],
    keywordsAny: [
      'supernatural',
      'ghost',
      'haunting',
      'demon',
      'demonic possession',
      'possession',
    ],
  },
  {
    key: 'taste:russian-romantic-tv',
    label: 'Russian Romantic TV',
    mediaTypes: ['tv'],
    originLanguages: ['ru'],
    originCountries: ['RU'],
    keywordsAny: [
      'romance',
      'love',
      'falling in love',
      'first love',
      'love triangle',
      'romantic relationship',
      'relationship',
    ],
  },
])

function hasAny(values, expected) {
  if (!expected?.length) return true
  return expected.some(value => values.has(value))
}

function hasAll(values, expected) {
  if (!expected?.length) return true
  return expected.every(value => values.has(value))
}

function matchesOrigin(metadata, rule) {
  const languages = rule.originLanguages ?? []
  const countries = rule.originCountries ?? []

  if (!languages.length && !countries.length) return true

  const languageMatch = languages.includes(
    metadata.originalLanguage?.code,
  )

  const countryCodes = new Set(
    metadata.countries.map(country => country.code),
  )

  const countryMatch = countries.some(
    country => countryCodes.has(country),
  )

  return languageMatch || countryMatch
}

function matchesRule(metadata, mediaType, rule) {
  if (
    rule.mediaTypes?.length
    && !rule.mediaTypes.includes(mediaType)
  ) {
    return false
  }

  const genres = new Set(
    metadata.genres.map(genre => genre.id),
  )

  if (!hasAny(genres, rule.genresAny)) return false
  if (!hasAll(genres, rule.genresAll)) return false

  const keywords = new Set(
    metadata.keywords.map(keyword => keyword.name),
  )

  if (!hasAny(keywords, rule.keywordsAny)) return false
  if (!matchesOrigin(metadata, rule)) return false

  return true
}

export function inferTasteTags(metadata, mediaType) {
  return TASTE_RULES
    .filter(rule => matchesRule(metadata, mediaType, rule))
    .map(rule => ({
      key: rule.key,
      label: rule.label,
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

export { TASTE_RULES }
