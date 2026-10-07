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
    key: 'taste:romantic-drama',
    label: 'Romantic Drama',
    genresAll: [18, 10749],
    keywordsAny: [
      'romance',
      'love',
      'falling in love',
      'romantic relationship',
      'love story',
      'love triangle',
      'forbidden love',
      'unrequited love',
    ],
  },
  {
    key: 'taste:romantic-comedy',
    label: 'Romantic Comedy',
    genresAll: [35, 10749],
    keywordsAny: [
      'romance',
      'falling in love',
      'romantic relationship',
      'romantic comedy',
      'love story',
      'dating',
      'wedding',
    ],
  },
  {
    key: 'taste:mystery-detective',
    label: 'Mystery Detective',
    genresAny: [80, 9648],
    keywordsAny: [
      'detective',
      'investigation',
      'murder investigation',
      'murder mystery',
      'private detective',
      'police detective',
      'crime investigation',
      'whodunit',
    ],
  },
  {
    key: 'taste:action-spectacle',
    label: 'Action Spectacle',
    genresAny: [12, 28, 10759],
    keywordsAny: [
      'explosion',
      'car chase',
      'chase',
      'stunt',
      'rescue mission',
      'special forces',
      'mercenary',
      'destruction',
    ],
  },
  {
    key: 'taste:fantasy-adventure',
    label: 'Fantasy Adventure',
    genresAny: [12, 14, 10765],
    keywordsAny: [
      'magic',
      'wizard',
      'quest',
      'fantasy world',
      'mythical creature',
      'magical creature',
      'sword and sorcery',
      'kingdom',
    ],
  },
  {
    key: 'taste:dark-fantasy',
    label: 'Dark Fantasy',
    genresAny: [14, 27, 10765],
    keywordsAny: [
      'dark fantasy',
      'curse',
      'witchcraft',
      'occult',
      'gothic',
      'demon',
      'black magic',
    ],
  },
  {
    key: 'taste:historical-period',
    label: 'Historical Period',
    genresAny: [18, 36],
    keywordsAny: [
      'period drama',
      'historical fiction',
      'historical',
      'victorian england',
      '19th century',
      '18th century',
      'medieval',
      'renaissance',
    ],
  },
  {
    key: 'taste:war-drama',
    label: 'War Drama',
    genresAny: [18, 10752, 10768],
    keywordsAny: [
      'war',
      'world war i',
      'world war ii',
      'soldier',
      'battlefield',
      'military',
      'war trauma',
      'anti war',
    ],
  },
  {
    key: 'taste:anime',
    label: 'Anime',
    genresAny: [16],
    originLanguages: ['ja'],
    originCountries: ['JP'],
  },
  {
    key: 'taste:adult-animation',
    label: 'Adult Animation',
    genresAny: [16],
    keywordsAny: [
      'adult animation',
      'adult cartoon',
      'animated sitcom',
      'adult humor',
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
