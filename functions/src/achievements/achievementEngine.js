import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_SCHEMA_VERSION,
} from './achievementDefinitions.js'

function readMetric(metrics, path) {
  if (!metrics || typeof metrics !== 'object') return undefined

  return path
    .split('.')
    .reduce(
      (value, key) => (
        value && typeof value === 'object'
          ? value[key]
          : undefined
      ),
      metrics,
    )
}

export function normalizeAchievementMetric(value) {
  if (value === true) return 1
  if (value === false || value === null || value === undefined) return 0

  if (
    typeof value !== 'number'
    || !Number.isFinite(value)
    || value < 0
  ) {
    return 0
  }

  return Math.floor(value)
}

function previousAchievement(previous, id) {
  if (!previous || typeof previous !== 'object') return null

  const value = previous[id]

  return value && typeof value === 'object'
    ? value
    : null
}

export function evaluateAchievement(
  definition,
  metrics,
  previous = {},
) {
  const measured = normalizeAchievementMetric(
    readMetric(metrics, definition.metric),
  )

  const before = previousAchievement(previous, definition.id)
  const wasUnlocked = before?.unlocked === true
  const reachesTarget = measured >= definition.target

  const unlocked = wasUnlocked || reachesTarget

  return Object.freeze({
    id: definition.id,
    category: definition.category,
    displayOrder: definition.displayOrder,
    current: Math.min(measured, definition.target),
    target: definition.target,
    unlocked,
    newlyUnlocked: !wasUnlocked && reachesTarget,
  })
}

export function evaluateAchievements({
  metrics = {},
  previous = {},
} = {}) {
  const achievements = ACHIEVEMENT_DEFINITIONS.map(
    (definition) => evaluateAchievement(
      definition,
      metrics,
      previous,
    ),
  )

  return Object.freeze({
    schemaVersion: ACHIEVEMENT_SCHEMA_VERSION,
    completedCount: achievements.filter(
      ({ unlocked }) => unlocked,
    ).length,
    totalCount: achievements.length,
    achievements: Object.freeze(achievements),
  })
}

export function achievementStateById(achievements = []) {
  return Object.fromEntries(
    achievements.map((achievement) => [
      achievement.id,
      achievement,
    ]),
  )
}
