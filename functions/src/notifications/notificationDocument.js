import { createHash } from 'node:crypto'

export const NOTIFICATION_SCHEMA_VERSION = 1

const TYPE_PREFIX = Object.freeze({
  friend_request: 'friend-request',
  friend_accepted: 'friend-accepted',
  achievement_unlocked: 'achievement-unlocked',
})

function validId(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && value.length <= 500
    && !value.includes('/')
  )
}

function validOccurrenceId(value) {
  return (
    typeof value === 'string'
    && value.length > 0
  )
}

function validMetadata(value) {
  return (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
  )
}

function occurrenceHash(value) {
  if (!validOccurrenceId(value)) {
    throw new TypeError(
      'Invalid notification occurrence',
    )
  }

  return createHash('sha256')
    .update(value)
    .digest('hex')
    .slice(0, 24)
}

export function createNotificationId(
  type,
  entityId,
  occurrenceId,
) {
  const prefix = TYPE_PREFIX[type]

  if (!prefix || !validId(entityId)) {
    throw new TypeError(
      'Invalid notification identity',
    )
  }

  return [
    prefix,
    entityId,
    occurrenceHash(occurrenceId),
  ].join('__')
}

export function buildNotificationDocument({
  type,
  actorUid,
  entityId,
  occurrenceId,
  metadata = {},
  serverTimestamp,
}) {
  if (
    typeof serverTimestamp !== 'function'
    || !validMetadata(metadata)
  ) {
    throw new TypeError(
      'Invalid notification input',
    )
  }

  if (
    type === 'achievement_unlocked'
    && actorUid !== null
  ) {
    throw new TypeError(
      'Achievement notification actor must be null',
    )
  }

  if (
    type !== 'achievement_unlocked'
    && !validId(actorUid)
  ) {
    throw new TypeError(
      'Social notification requires an actor',
    )
  }

  const id = createNotificationId(
    type,
    entityId,
    occurrenceId,
  )

  return {
    id,
    document: {
      schemaVersion:
        NOTIFICATION_SCHEMA_VERSION,
      type,
      actorUid,
      entityId,
      metadata,
      createdAt: serverTimestamp(),
      readAt: null,
    },
  }
}
