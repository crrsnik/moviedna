import {
  normalizeMediaSnapshot,
} from '../../library/validation/libraryValidation.js'

import {
  ViewingHistoryError,
} from '../services/viewingHistoryErrors.js'

const EVENT_ID = /^[A-Za-z0-9]{20}$/
const WATCHED_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function fail(code) {
  throw new ViewingHistoryError(code)
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}

function normalizeNamedItems(values, maximum) {
  if (!Array.isArray(values) || values.length > maximum) {
    fail('invalid-media')
  }

  const result = new Map()

  for (const value of values) {
    if (
      !value
      || typeof value !== 'object'
      || Array.isArray(value)
      || !positiveInteger(value.id)
      || typeof value.name !== 'string'
      || !value.name.trim()
      || value.name.trim().length > 200
    ) {
      fail('invalid-media')
    }

    const name = value.name.trim()

    if (!result.has(value.id)) {
      result.set(value.id, {
        id: value.id,
        name,
      })
    }
  }

  return [...result.values()]
    .sort((a, b) => a.id - b.id)
}

export function validateViewingEventId(eventId) {
  if (
    typeof eventId !== 'string'
    || !EVENT_ID.test(eventId)
  ) {
    fail('invalid-event')
  }

  return eventId
}

export function validateWatchedDate(value) {
  if (typeof value !== 'string') fail('invalid-date')

  const match = value.match(WATCHED_DATE)
  if (!match) fail('invalid-date')

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (year < 1900 || year > 2199) fail('invalid-date')

  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    fail('invalid-date')
  }

  return value
}

export function viewingHistoryMediaSnapshot(input) {
  let media

  try {
    media = normalizeMediaSnapshot(input)
  } catch {
    fail('invalid-media')
  }

  const genres = normalizeNamedItems(
    input?.genres ?? [],
    20,
  )

  const directors = media.mediaType === 'movie'
    ? normalizeNamedItems(input?.directors ?? [], 10)
    : []

  const creators = media.mediaType === 'tv'
    ? normalizeNamedItems(input?.creators ?? [], 10)
    : []

  return {
    ...media,
    genres,
    directors,
    creators,
  }
}
