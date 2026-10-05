function validUid(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
  )
}

function snapshotData(snapshot) {
  if (!snapshot?.exists) return null

  const data = snapshot.data?.()

  return data && typeof data === 'object'
    ? data
    : null
}

function achievementMap(data) {
  const achievements = data?.achievements

  if (
    !achievements
    || typeof achievements !== 'object'
    || Array.isArray(achievements)
  ) {
    return {}
  }

  return achievements
}

export function newlyUnlockedAchievementIds(event) {
  const before = achievementMap(
    snapshotData(event?.data?.before),
  )

  const after = achievementMap(
    snapshotData(event?.data?.after),
  )

  return Object.entries(after)
    .filter(([id, state]) => (
      validUid(id)
      && state?.unlocked === true
      && before[id]?.unlocked !== true
    ))
    .map(([id]) => id)
    .sort()
}

export function createAchievementNotificationHandler({
  notify,
}) {
  if (typeof notify !== 'function') {
    throw new TypeError('notify must be a function')
  }

  return async function achievementNotificationWrite(
    event,
  ) {
    const uid = event?.params?.uid
    const occurrenceId = event?.id

    if (
      !validUid(uid)
      || typeof occurrenceId !== 'string'
      || !occurrenceId
    ) {
      return {
        status: 'ignored',
        notifications: [],
      }
    }

    const ids = newlyUnlockedAchievementIds(event)

    if (!ids.length) {
      return {
        status: 'ignored',
        notifications: [],
      }
    }

    const notifications = await Promise.all(
      ids.map(achievementId => notify({
        uid,
        type: 'achievement_unlocked',
        actorUid: null,
        entityId: achievementId,
        occurrenceId,
        metadata: {
          achievementId,
        },
      })),
    )

    return {
      status: 'processed',
      notifications,
    }
  }
}
