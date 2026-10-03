function achievementMap(value) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    return {}
  }

  return value
}

export function buildAchievementDocument({
  evaluation,
  previousAchievements = {},
  serverTimestamp,
}) {
  if (
    !evaluation
    || !Array.isArray(evaluation.achievements)
    || typeof serverTimestamp !== 'function'
  ) {
    throw new TypeError('Invalid achievement document input')
  }

  const previous = achievementMap(previousAchievements)
  const achievements = {}

  for (const state of evaluation.achievements) {
    const before = previous[state.id]
    const wasUnlocked = before?.unlocked === true

    const unlocked = (
      wasUnlocked
      || state.unlocked === true
    )

    achievements[state.id] = {
      category: state.category,
      displayOrder: state.displayOrder,
      current: state.current,
      target: state.target,
      unlocked,
      unlockedAt: (
        before?.unlockedAt
        ?? (
          unlocked
            ? serverTimestamp()
            : null
        )
      ),
    }
  }

  const completedCount = Object.values(
    achievements,
  ).filter(
    achievement => achievement.unlocked === true,
  ).length

  return {
    schemaVersion: evaluation.schemaVersion,
    completedCount,
    totalCount: evaluation.totalCount,
    achievements,
    updatedAt: serverTimestamp(),
  }
}
