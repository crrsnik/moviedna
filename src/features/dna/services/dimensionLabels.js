const GENRES = Object.freeze({
  en: new Map([
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
  ]),

  fr: new Map([
    [12, 'Aventure'],
    [14, 'Fantastique'],
    [16, 'Animation'],
    [18, 'Drame'],
    [27, 'Horreur'],
    [28, 'Action'],
    [35, 'Comédie'],
    [36, 'Histoire'],
    [37, 'Western'],
    [53, 'Thriller'],
    [80, 'Crime'],
    [99, 'Documentaire'],
    [878, 'Science-fiction'],
    [9648, 'Mystère'],
    [10402, 'Musique'],
    [10749, 'Romance'],
    [10751, 'Familial'],
    [10752, 'Guerre'],
    [10759, 'Action et aventure'],
    [10762, 'Enfants'],
    [10763, 'Actualités'],
    [10764, 'Téléréalité'],
    [10765, 'Science-fiction et fantastique'],
    [10766, 'Feuilleton'],
    [10767, 'Talk-show'],
    [10768, 'Guerre et politique'],
    [10770, 'Téléfilm'],
  ]),

  ru: new Map([
    [12, 'Приключения'],
    [14, 'Фэнтези'],
    [16, 'Анимация'],
    [18, 'Драма'],
    [27, 'Ужасы'],
    [28, 'Боевик'],
    [35, 'Комедия'],
    [36, 'История'],
    [37, 'Вестерн'],
    [53, 'Триллер'],
    [80, 'Криминал'],
    [99, 'Документальный'],
    [878, 'Фантастика'],
    [9648, 'Детектив'],
    [10402, 'Музыка'],
    [10749, 'Мелодрама'],
    [10751, 'Семейный'],
    [10752, 'Военный'],
    [10759, 'Боевик и приключения'],
    [10762, 'Детский'],
    [10763, 'Новости'],
    [10764, 'Реалити-шоу'],
    [10765, 'Фантастика и фэнтези'],
    [10766, 'Мыльная опера'],
    [10767, 'Ток-шоу'],
    [10768, 'Война и политика'],
    [10770, 'Телефильм'],
  ]),
})

const MEDIA_TYPES = Object.freeze({
  en: {
    movie: 'Movies',
    tv: 'TV',
  },

  fr: {
    movie: 'Films',
    tv: 'Séries',
  },

  ru: {
    movie: 'Фильмы',
    tv: 'Сериалы',
  },
})

const FALLBACKS = Object.freeze({
  en: {
    genre: 'Unknown genre',
    language: 'Unknown language',
    country: 'Unknown country',
    director: 'Unknown director',
    creator: 'Unknown creator',
    actor: 'Unknown actor',
  },

  fr: {
    genre: 'Genre inconnu',
    language: 'Langue inconnue',
    country: 'Pays inconnu',
    director: 'Réalisateur inconnu',
    creator: 'Créateur inconnu',
    actor: 'Acteur inconnu',
  },

  ru: {
    genre: 'Неизвестный жанр',
    language: 'Неизвестный язык',
    country: 'Неизвестная страна',
    director: 'Неизвестный режиссёр',
    creator: 'Неизвестный создатель',
    actor: 'Неизвестный актёр',
  },
})

function safeLocale(locale) {
  return ['en', 'fr', 'ru'].includes(
    locale,
  )
    ? locale
    : 'en'
}

export function resolveGenreIdLabel(
  value,
  locale = 'en',
) {
  const id = Number(value)
  const selectedLocale =
    safeLocale(locale)

  return Number.isSafeInteger(id)
    ? (
        GENRES[selectedLocale].get(id)
        ?? null
      )
    : null
}

function displayName(
  type,
  code,
  fallback,
  locale,
) {
  try {
    return (
      new Intl.DisplayNames(
        [safeLocale(locale)],
        {
          type,
          fallback: 'none',
        },
      ).of(code)
      ?? fallback
    )
  } catch {
    return fallback
  }
}

function keyValue(
  key,
  prefix,
) {
  return (
    typeof key === 'string'
    && key.startsWith(prefix)
  )
    ? key.slice(prefix.length)
    : null
}

function personLabel(
  label,
  fallback,
) {
  return (
    typeof label === 'string'
    && label.trim()
    && !/^\d+$/.test(label.trim())
  )
    ? label.trim()
    : fallback
}

function decadeLabel(
  decade,
  locale,
) {
  if (!/^\d{4}$/.test(decade ?? '')) {
    return null
  }

  if (locale === 'fr') {
    return `Années ${decade}`
  }

  if (locale === 'ru') {
    return `${decade}-е`
  }

  return `${decade}s`
}

export function resolveDimensionLabel(
  dimension,
  entry,
  locale = 'en',
) {
  const selectedLocale =
    safeLocale(locale)

  const fallback =
    FALLBACKS[selectedLocale]

  const stored = (
    typeof entry?.label === 'string'
  )
    ? entry.label.trim()
    : ''

  if (dimension === 'genres') {
    const id = keyValue(
      entry?.key,
      'genre:',
    )

    return (
      resolveGenreIdLabel(
        id,
        selectedLocale,
      )
      ?? fallback.genre
    )
  }

  if (dimension === 'mediaTypes') {
    const type = keyValue(
      entry?.key,
      'media:',
    )

    return (
      MEDIA_TYPES[selectedLocale][type]
      ?? stored
    )
  }

  if (dimension === 'decades') {
    const decade = keyValue(
      entry?.key,
      'decade:',
    )

    return (
      decadeLabel(
        decade,
        selectedLocale,
      )
      ?? stored
    )
  }

  if (dimension === 'languages') {
    const code = keyValue(
      entry?.key,
      'language:',
    )

    return /^[a-z]{2}$/.test(
      code ?? '',
    )
      ? displayName(
          'language',
          code,
          fallback.language,
          selectedLocale,
        )
      : fallback.language
  }

  if (dimension === 'countries') {
    const code = keyValue(
      entry?.key,
      'country:',
    )

    return /^[A-Z]{2}$/.test(
      code ?? '',
    )
      ? displayName(
          'region',
          code,
          fallback.country,
          selectedLocale,
        )
      : fallback.country
  }

  if (dimension === 'directors') {
    return personLabel(
      stored,
      fallback.director,
    )
  }

  if (dimension === 'creators') {
    return personLabel(
      stored,
      fallback.creator,
    )
  }

  if (dimension === 'actors') {
    return personLabel(
      stored,
      fallback.actor,
    )
  }

  return stored
}
