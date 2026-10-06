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

function increment(object, key) {
  object[key] = (object[key] ?? 0) + 1
}

function addSetValue(map, key, value) {
  if (!map.has(key)) {
    map.set(key, new Set())
  }

  map.get(key).add(value)
}

function maximum(values) {
  return values.length
    ? Math.max(...values)
    : 0
}

export function watchedMediaForAchievements(
  savedMedia = [],
) {
  return uniqueMedia(
    savedMedia.filter(
      item => item?.watched === true,
    ),
  ).map(({
    mediaKey,
    tmdbId,
    mediaType,
  }) => ({
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
  const nonUsCountries = new Set()

  const byGenre = {}
  const byDecade = {}
  const byDirector = {}
  const byActor = {}
  const byCollection = {}

  const genreDecades = new Map()
  const directorDecades = new Map()
  const actorDecades = new Map()

  let pre1970 = 0
  let internationalTitles = 0

  for (const item of watched) {
    const metadata = watchedMetadata.get(
      mediaIdentity(item),
    )

    if (!metadata) continue

    let decade = null

    if (
      metadata.completeness?.releaseYear === true
      && validReleaseYear(metadata.releaseYear)
    ) {
      decade = (
        Math.floor(metadata.releaseYear / 10)
        * 10
      )

      decades.add(decade)
      increment(byDecade, decade)

      if (metadata.releaseYear < 1970) {
        pre1970 += 1
      }
    }

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
        increment(byGenre, genreId)

        if (decade !== null) {
          addSetValue(
            genreDecades,
            genreId,
            decade,
          )
        }
      }
    }

    if (
      metadata.completeness?.countries === true
      && Array.isArray(metadata.countries)
    ) {
      const itemCountries = new Set(
        metadata.countries
          .map(country => country?.code)
          .filter(validCountryCode),
      )

      let international = false

      for (const code of itemCountries) {
        countries.add(code)

        if (code !== 'US') {
          nonUsCountries.add(code)
          international = true
        }
      }

      if (international) {
        internationalTitles += 1
      }
    }

    if (
      metadata.completeness?.people === true
    ) {
      const directors = new Set(
        (
          Array.isArray(metadata.directors)
            ? metadata.directors
            : []
        )
          .map(person => person?.id)
          .filter(positiveInteger),
      )

      for (const directorId of directors) {
        increment(byDirector, directorId)

        if (decade !== null) {
          addSetValue(
            directorDecades,
            directorId,
            decade,
          )
        }
      }

      const actors = new Set(
        (
          Array.isArray(metadata.actors)
            ? metadata.actors
            : []
        )
          .map(person => person?.id)
          .filter(positiveInteger),
      )

      for (const actorId of actors) {
        increment(byActor, actorId)

        if (decade !== null) {
          addSetValue(
            actorDecades,
            actorId,
            decade,
          )
        }
      }
    }

    if (
      item.mediaType === 'movie'
      && positiveInteger(metadata.collectionId)
    ) {
      increment(
        byCollection,
        metadata.collectionId,
      )
    }
  }

  const maxDirectorTitles = maximum(
    Object.values(byDirector),
  )

  const maxActorTitles = maximum(
    Object.values(byActor),
  )

  const maxCollectionTitles = maximum(
    Object.values(byCollection),
  )

  const maxGenreDecades = maximum(
    [...genreDecades.values()].map(
      values => values.size,
    ),
  )

  const genresWith10 = Object.values(
    byGenre,
  ).filter(count => count >= 10).length

  const decadesWith10 = Object.values(
    byDecade,
  ).filter(count => count >= 10).length

  const directorJourney = Object.entries(
    byDirector,
  ).some(([id, count]) => (
    count >= 10
    && (
      directorDecades.get(Number(id))?.size
      ?? directorDecades.get(id)?.size
      ?? 0
    ) >= 3
  ))

  const actorEras = Object.entries(
    byActor,
  ).some(([id, count]) => (
    count >= 20
    && (
      actorDecades.get(Number(id))?.size
      ?? actorDecades.get(id)?.size
      ?? 0
    ) >= 4
  ))

  const worldCinemaScholar = (
    internationalTitles >= 100
    && nonUsCountries.size >= 20
  )

  const globalNomad = (
    internationalTitles >= 150
    && nonUsCountries.size >= 25
  )

  const longRoad = (
    watched.length >= 500
    && uniqueRatings.length >= 250
    && favorites.length >= 50
    && genres.size >= 10
    && countries.size >= 10
  )

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

      byGenre: Object.freeze({
        ...byGenre,
      }),

      maxDirectorTitles,
      maxActorTitles,
      pre1970,
      maxGenreDecades,
      genresWith10,
      decadesWith10,
      worldCinemaScholar:
        worldCinemaScholar ? 1 : 0,

      directorJourney:
        directorJourney ? 1 : 0,

      actorEras:
        actorEras ? 1 : 0,

      maxCollectionTitles,

      globalNomad:
        globalNomad ? 1 : 0,
    }),

    favorites: Object.freeze({
      total: favorites.length,
    }),

    friends: Object.freeze({
      accepted: acceptedFriends.size,
    }),

    milestones: Object.freeze({
      longRoad: longRoad ? 1 : 0,
    }),
  })
}
