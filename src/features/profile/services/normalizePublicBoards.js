const LIST_ID_PATTERN = /^[A-Za-z0-9]{20}$/
const MEDIA_KEY_PATTERN = /^(movie|tv)_[1-9][0-9]{0,11}$/

function plain(value) {
  return (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
  )
}

function exactKeys(data, expected) {
  const keys = Object.keys(data).sort()
  return (
    keys.length === expected.length
    && keys.every((key, index) => (
      key === [...expected].sort()[index]
    ))
  )
}

function normalizeTimestamp(value) {
  if (typeof value?.toDate !== 'function') {
    throw new Error('invalid-timestamp')
  }

  const date = value.toDate()

  if (
    !(date instanceof Date)
    || Number.isNaN(date.getTime())
  ) {
    throw new Error('invalid-timestamp')
  }

  return date.toISOString()
}

export function normalizePublicBoard(snapshot, ownerId) {
  const data = snapshot?.data?.()

  if (
    !snapshot?.exists?.()
    || !plain(data)
    || !exactKeys(data, [
      'schemaVersion',
      'ownerId',
      'listId',
      'name',
      'description',
      'createdAt',
      'updatedAt',
    ])
    || data.schemaVersion !== 1
    || typeof ownerId !== 'string'
    || !ownerId
    || data.ownerId !== ownerId
    || typeof data.listId !== 'string'
    || !LIST_ID_PATTERN.test(data.listId)
    || data.listId !== snapshot.id
    || typeof data.name !== 'string'
    || !data.name.trim()
    || data.name.length > 60
    || typeof data.description !== 'string'
    || data.description.length > 300
  ) {
    throw new Error('invalid-public-board')
  }

  return {
    id: data.listId,
    ownerId,
    name: data.name.trim(),
    description: data.description.trim(),
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  }
}

export function normalizePublicBoardItem(snapshot) {
  const data = snapshot?.data?.()
  const mediaKey = snapshot?.id

  const fields = [
    'schemaVersion',
    'tmdbId',
    'mediaType',
    'title',
    'posterPath',
    'releaseYear',
    'updatedAt',
  ]

  const validShape = (
    exactKeys(data, fields)
    || exactKeys(data, [
      ...fields,
      'addedAt',
    ])
  )

  if (
    !snapshot?.exists?.()
    || !plain(data)
    || !validShape
    || data.schemaVersion !== 1
    || typeof mediaKey !== 'string'
    || !MEDIA_KEY_PATTERN.test(mediaKey)
    || !Number.isSafeInteger(data.tmdbId)
    || data.tmdbId < 1
    || data.tmdbId > 999999999999
    || !['movie', 'tv'].includes(
      data.mediaType,
    )
    || `${data.mediaType}_${data.tmdbId}`
      !== mediaKey
    || typeof data.title !== 'string'
    || !data.title.trim()
    || data.title.length > 200
    || !(
      data.posterPath === null
      || (
        typeof data.posterPath === 'string'
        && data.posterPath.length <= 200
        && /^\/[A-Za-z0-9_./-]+$/.test(
          data.posterPath,
        )
        && !data.posterPath.includes('..')
      )
    )
    || !(
      data.releaseYear === null
      || (
        Number.isSafeInteger(
          data.releaseYear,
        )
        && data.releaseYear >= 1800
        && data.releaseYear <= 2200
      )
    )
    || !(
      data.addedAt === undefined
      || data.addedAt === null
      || typeof data.addedAt?.toDate
        === 'function'
    )
  ) {
    throw new Error(
      'invalid-public-board-item',
    )
  }

  return {
    key: mediaKey,
    tmdbId: data.tmdbId,
    mediaType: data.mediaType,
    title: data.title.trim(),
    posterPath: data.posterPath,
    releaseYear: data.releaseYear,
    addedAt: (
      data.addedAt === undefined
      || data.addedAt === null
    )
      ? null
      : normalizeTimestamp(data.addedAt),
    updatedAt: normalizeTimestamp(
      data.updatedAt,
    ),
  }
}

export function normalizePublicBoards(snapshot, ownerId) {
  return snapshot.docs
    .map(document => normalizePublicBoard(document, ownerId))
    .sort((a, b) => (
      a.createdAt.localeCompare(b.createdAt)
      || a.name.localeCompare(b.name, 'en')
      || a.id.localeCompare(b.id)
    ))
}

export function normalizePublicBoardItems(snapshot) {
  return snapshot.docs
    .map(normalizePublicBoardItem)
    .sort((a, b) => {
      // Legacy memberships do not have a
      // trustworthy historical addedAt.
      // Treat them as older than newly tracked
      // memberships so new additions cannot
      // unexpectedly become the board cover.
      if (
        a.addedAt === null
        && b.addedAt !== null
      ) return -1

      if (
        a.addedAt !== null
        && b.addedAt === null
      ) return 1

      return (
        (
          a.addedAt !== null
          && b.addedAt !== null
          && a.addedAt.localeCompare(
            b.addedAt,
          )
        )
        || a.title.localeCompare(
          b.title,
          'en',
        )
        || a.key.localeCompare(b.key)
      )
    })
}
