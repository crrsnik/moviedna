import {
  validateViewingEventId,
  validateWatchedDate,
  viewingHistoryMediaSnapshot,
} from '../validation/viewingHistoryValidation.js'

import {
  ViewingHistoryError,
} from './viewingHistoryErrors.js'

function timestamp(value) {
  if (!value?.toDate || typeof value.toDate !== 'function') {
    throw new ViewingHistoryError('malformed')
  }

  const date = value.toDate()

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new ViewingHistoryError('malformed')
  }

  return date.toISOString()
}

export function normalizeViewingEvent(snapshot) {
  if (!snapshot?.id || typeof snapshot.data !== 'function') {
    throw new ViewingHistoryError('malformed')
  }

  const eventId = validateViewingEventId(snapshot.id)
  const data = snapshot.data()

  if (
    !data
    || typeof data !== 'object'
    || Array.isArray(data)
    || data.schemaVersion !== 1
  ) {
    throw new ViewingHistoryError('malformed')
  }

  let media
  let watchedDate

  try {
    media = viewingHistoryMediaSnapshot(data)
    watchedDate = validateWatchedDate(data.watchedDate)
  } catch {
    throw new ViewingHistoryError('malformed')
  }

  return {
    eventId,
    schemaVersion: 1,
    ...media,
    watchedDate,
    createdAt: timestamp(data.createdAt),
    updatedAt: timestamp(data.updatedAt),
  }
}

export function normalizeViewingHistory(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.docs)) {
    throw new ViewingHistoryError('malformed')
  }

  const events = []

  for (const document of snapshot.docs) {
    try {
      events.push(normalizeViewingEvent(document))
    } catch {
      // One malformed historical record must not break the whole history.
    }
  }

  return events.sort((a, b) => (
    b.watchedDate.localeCompare(a.watchedDate)
    || b.createdAt.localeCompare(a.createdAt)
    || a.eventId.localeCompare(b.eventId)
  ))
}
