const MEDIA_TYPES = new Set(['movie', 'tv'])
const TOP_LIMIT = 5

function round(value, decimals = 6) {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function validCalendarDate(value) {
  if (
    typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  )
}

function validEvent(event, today) {
  return (
    event
    && typeof event === 'object'
    && MEDIA_TYPES.has(event.mediaType)
    && validCalendarDate(event.watchedDate)
    && event.watchedDate <= today
  )
}

function rankedNamedItems(events, field) {
  const counts = new Map()

  for (const event of events) {
    const items = Array.isArray(event[field])
      ? event[field]
      : []

    const seen = new Set()

    for (const item of items) {
      if (
        !item
        || !Number.isSafeInteger(item.id)
        || item.id <= 0
        || typeof item.name !== 'string'
        || !item.name.trim()
        || seen.has(item.id)
      ) {
        continue
      }

      seen.add(item.id)

      const current = counts.get(item.id)

      if (current) {
        current.count += 1
      } else {
        counts.set(item.id, {
          id: item.id,
          name: item.name.trim(),
          count: 1,
        })
      }
    }
  }

  return [...counts.values()]
    .sort((a, b) => (
      b.count - a.count
      || a.name.localeCompare(b.name)
      || a.id - b.id
    ))
    .slice(0, TOP_LIMIT)
}

function rankedDecades(events) {
  const counts = new Map()

  for (const event of events) {
    const year = event.releaseYear

    if (
      !Number.isInteger(year)
      || year < 1800
      || year > 2200
    ) {
      continue
    }

    const decade = Math.floor(year / 10) * 10
    counts.set(decade, (counts.get(decade) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([decade, count]) => ({
      decade,
      label: `${decade}s`,
      count,
    }))
    .sort((a, b) => (
      b.count - a.count
      || b.decade - a.decade
    ))
    .slice(0, TOP_LIMIT)
}

function monthlyActivity(events, today) {
  const year = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(5, 7))

  const counts = new Map()

  for (const event of events) {
    if (!event.watchedDate.startsWith(`${year}-`)) continue

    const month = event.watchedDate.slice(0, 7)
    counts.set(month, (counts.get(month) ?? 0) + 1)
  }

  return Array.from(
    { length: currentMonth },
    (_, index) => {
      const monthNumber = index + 1
      const month = `${year}-${String(monthNumber).padStart(2, '0')}`

      return {
        month,
        count: counts.get(month) ?? 0,
      }
    },
  )
}

export function calculateViewingStats(events, today) {
  if (!Array.isArray(events)) {
    throw new TypeError('Viewing history must be an array.')
  }

  if (!validCalendarDate(today)) {
    throw new TypeError('Today must be a valid YYYY-MM-DD date.')
  }

  const validEvents = events.filter(
    event => validEvent(event, today),
  )

  const year = today.slice(0, 4)
  const month = today.slice(0, 7)

  const thisMonth = validEvents.filter(
    event => event.watchedDate.startsWith(month),
  ).length

  const thisYear = validEvents.filter(
    event => event.watchedDate.startsWith(`${year}-`),
  ).length

  const movieEvents = validEvents.filter(
    event => event.mediaType === 'movie',
  )

  const tvEvents = validEvents.filter(
    event => event.mediaType === 'tv',
  )

  const totalViewings = validEvents.length

  return {
    totalViewings,
    thisMonth,
    thisYear,

    mediaTypes: {
      movieCount: movieEvents.length,
      tvCount: tvEvents.length,
      movieShare: totalViewings
        ? round(movieEvents.length / totalViewings)
        : 0,
      tvShare: totalViewings
        ? round(tvEvents.length / totalViewings)
        : 0,
    },

    monthlyActivity: monthlyActivity(
      validEvents,
      today,
    ),

    topGenres: rankedNamedItems(
      validEvents,
      'genres',
    ),

    topDirectors: rankedNamedItems(
      movieEvents,
      'directors',
    ),

    topCreators: rankedNamedItems(
      tvEvents,
      'creators',
    ),

    topDecades: rankedDecades(validEvents),
  }
}
