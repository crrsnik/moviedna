export class AchievementDocumentError extends Error {
  constructor(code) {
    super('Achievement data is unavailable.')
    this.name = 'AchievementDocumentError'
    this.code = code
  }
}

function plain(value) {
  return (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
  )
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}

function timestamp(value, nullable = false) {
  if (nullable && value === null) {
    return null
  }

  if (
    !value
    || typeof value.toDate !== 'function'
  ) {
    throw new AchievementDocumentError('malformed')
  }

  const date = value.toDate()

  if (
    !(date instanceof Date)
    || Number.isNaN(date.getTime())
  ) {
    throw new AchievementDocumentError('malformed')
  }

  return date
}

function normalizeAchievement(id, value) {
  if (
    typeof id !== 'string'
    || !/^[a-z][a-z0-9_]*$/.test(id)
    || !plain(value)
    || typeof value.category !== 'string'
    || !value.category
    || !nonNegativeInteger(value.displayOrder)
    || !nonNegativeInteger(value.current)
    || !positiveInteger(value.target)
    || value.current > value.target
    || typeof value.unlocked !== 'boolean'
  ) {
    throw new AchievementDocumentError('malformed')
  }

  const unlockedAt = timestamp(
    value.unlockedAt,
    !value.unlocked,
  )

  if (
    value.unlocked
    && unlockedAt === null
  ) {
    throw new AchievementDocumentError('malformed')
  }

  if (
    !value.unlocked
    && unlockedAt !== null
  ) {
    throw new AchievementDocumentError('malformed')
  }

  return Object.freeze({
    id,
    category: value.category,
    displayOrder: value.displayOrder,
    current: value.current,
    target: value.target,
    unlocked: value.unlocked,
    unlockedAt,
  })
}

export function normalizeAchievementsCurrent(snapshot) {
  if (!snapshot.exists()) {
    return null
  }

  const value = snapshot.data()

  if (!plain(value)) {
    throw new AchievementDocumentError('malformed')
  }

  if (value.schemaVersion !== 1) {
    throw new AchievementDocumentError(
      value.schemaVersion == null
        ? 'malformed'
        : 'unsupported-version',
    )
  }

  if (
    !nonNegativeInteger(value.completedCount)
    || !nonNegativeInteger(value.totalCount)
    || !plain(value.achievements)
  ) {
    throw new AchievementDocumentError('malformed')
  }

  const achievements = Object.entries(
    value.achievements,
  ).map(
    ([id, achievement]) => (
      normalizeAchievement(id, achievement)
    ),
  )

  if (
    achievements.length !== value.totalCount
    || value.completedCount > value.totalCount
    || achievements.filter(
      achievement => achievement.unlocked,
    ).length !== value.completedCount
    || new Set(
      achievements.map(
        achievement => achievement.displayOrder,
      ),
    ).size !== achievements.length
  ) {
    throw new AchievementDocumentError('malformed')
  }

  achievements.sort(
    (a, b) => (
      a.displayOrder - b.displayOrder
      || a.id.localeCompare(b.id)
    ),
  )

  return Object.freeze({
    schemaVersion: 1,
    completedCount: value.completedCount,
    totalCount: value.totalCount,
    achievements: Object.freeze(achievements),
    updatedAt: timestamp(value.updatedAt),
  })
}
