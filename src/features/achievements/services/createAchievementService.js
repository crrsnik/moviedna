import {
  AchievementDocumentError,
  normalizeAchievementsCurrent,
} from './normalizeAchievements.js'

function validUid(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
  )
}

function normalizeError(error) {
  if (error instanceof AchievementDocumentError) {
    return error
  }

  if (error?.code === 'permission-denied') {
    return new AchievementDocumentError(
      'permission-denied',
    )
  }

  if (error?.code === 'unavailable') {
    return new AchievementDocumentError(
      'unavailable',
    )
  }

  return new AchievementDocumentError('unknown')
}

export function createAchievementService({
  database,
  document,
  subscribe,
}) {
  return {
    subscribe(uid, next, error) {
      if (
        !validUid(uid)
        || typeof next !== 'function'
      ) {
        error?.(
          new AchievementDocumentError(
            'invalid-user',
          ),
        )

        return () => {}
      }

      const reference = document(
        database,
        'users',
        uid,
        'achievements',
        'current',
      )

      return subscribe(
        reference,
        {
          includeMetadataChanges: true,
        },
        snapshot => {
          try {
            next(
              normalizeAchievementsCurrent(
                snapshot,
              ),
            )
          } catch (failure) {
            error?.(normalizeError(failure))
          }
        },
        failure => {
          error?.(normalizeError(failure))
        },
      )
    },
  }
}
