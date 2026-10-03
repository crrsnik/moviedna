function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}

function validMediaType(value) {
  return value === 'movie' || value === 'tv'
}

function mediaIdentity(item) {
  if (
    !item
    || !validMediaType(item.mediaType)
    || !positiveInteger(item.tmdbId)
  ) {
    return null
  }

  return `${item.mediaType}_${item.tmdbId}`
}

function uniqueMedia(items = []) {
  const result = new Map()

  for (const item of items) {
    const key = mediaIdentity(item)

    if (key && !result.has(key)) {
      result.set(key, {
        ...item,
        mediaKey: key,
      })
    }
  }

  return [...result.values()]
}

function validGenreId(value) {
  return positiveInteger(value)
}

function validCountryCode(value) {
  return (
    typeof value === 'string'
    && /^[A-Z]{2}$/.test(value)
  )
}

function validReleaseYear(value) {
  return (
    Number.isInteger(value)
    && value >= 1800
    && value <= 2200
  )
}

function metadataByKey(items = []) {
  const result = new Map()

  for (const item of items) {
    const key = mediaIdentity(item)

    if (
      key
      && item.metadata
      && typeof item.metadata === 'object'
    ) {
      result.set(key, item.metadata)
    }
  }

  return result
}

export function watchedMediaForAchievements(
  savedMedia = [],
) {
  return uniqueMedia(
    savedMedia.filter(
      item => item?.watched === true,
    ),
  ).map(({ mediaKey, tmdbId, mediaType }) => ({
    mediaKey,
    tmdbId,
    mediaType,
  }))
}

export function buildAchievementMetrics({
  uid,
  profile = null,
  dna = null,
  ratings = [],
  savedMedia = [],
  friendships = [],
  resolvedWatchedMedia = [],
} = {}) {
  const uniqueRatings = uniqueMedia(ratings)
  const uniqueSavedMedia = uniqueMedia(savedMedia)

  const watched = uniqueSavedMedia.filter(
    item => item.watched === true,
  )

  const favorites = uniqueSavedMedia.filter(
    item => item.favorite === true,
  )

  const watchedMetadata = metadataByKey(
    resolvedWatchedMedia,
  )

  const genres = new Set()
  const decades = new Set()
  const countries = new Set()
  const byGenre = {}

  for (const item of watched) {
    const metadata = watchedMetadata.get(
      mediaIdentity(item),
    )

    if (!metadata) continue

    if (
      metadata.completeness?.genres === true
      && Array.isArray(metadata.genres)
    ) {
      const itemGenres = new Set(
        metadata.genres
          .map(genre => genre?.id)
          .filter(validGenreId),
      )

      for (const genreId of itemGenres) {
        genres.add(genreId)
        byGenre[genreId] = (byGenre[genreId] ?? 0) + 1
      }
    }

    if (
      metadata.completeness?.releaseYear === true
      && validReleaseYear(metadata.releaseYear)
    ) {
      decades.add(
        Math.floor(metadata.releaseYear / 10) * 10,
      )
    }

    if (
      metadata.completeness?.countries === true
      && Array.isArray(metadata.countries)
    ) {
      for (const country of metadata.countries) {
        const code = country?.code

        if (validCountryCode(code)) {
          countries.add(code)
        }
      }
    }
  }

  const acceptedFriends = new Set()

  if (typeof uid === 'string' && uid) {
    for (const friendship of friendships) {
      if (
        friendship?.status !== 'accepted'
        || !Array.isArray(friendship.members)
        || friendship.members.length !== 2
        || !friendship.members.includes(uid)
      ) {
        continue
      }

      const other = friendship.members.find(
        member => member !== uid,
      )

      if (
        typeof other === 'string'
        && other
        && !other.includes('/')
      ) {
        acceptedFriends.add(other)
      }
    }
  }

  return Object.freeze({
    profile: Object.freeze({
      onboardingCompleted:
        profile?.onboardingCompleted === true,
    }),

    dna: Object.freeze({
      ready: dna?.status === 'ready',
    }),

    ratings: Object.freeze({
      total: uniqueRatings.length,
    }),

    watched: Object.freeze({
      total: watched.length,
      movies: watched.filter(
        item => item.mediaType === 'movie',
      ).length,
      tv: watched.filter(
        item => item.mediaType === 'tv',
      ).length,
      distinctGenres: genres.size,
      distinctDecades: decades.size,
      distinctCountries: countries.size,
      byGenre: Object.freeze({ ...byGenre }),
    }),

    favorites: Object.freeze({
      total: favorites.length,
    }),

    friends: Object.freeze({
      accepted: acceptedFriends.size,
    }),
  })
}
