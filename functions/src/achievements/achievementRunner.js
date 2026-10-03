import {
  buildAchievementMetrics,
  watchedMediaForAchievements,
} from './achievementMetrics.js'

import {
  evaluateAchievements,
} from './achievementEngine.js'

function previousAchievementState(previous) {
  const achievements = previous?.achievements

  if (
    !achievements
    || typeof achievements !== 'object'
    || Array.isArray(achievements)
  ) {
    return {}
  }

  return achievements
}

export function createAchievementRunner({
  store,
  metadataResolver,
}) {
  return async function recalculateAchievements(uid) {
    const context = await store.loadContext(uid)

    const watchedMedia = watchedMediaForAchievements(
      context.savedMedia,
    )

    const resolvedWatchedMedia = watchedMedia.length
      ? await metadataResolver.resolve(watchedMedia)
      : []

    const metrics = buildAchievementMetrics({
      uid,
      profile: context.profile,
      dna: context.dna,
      ratings: context.ratings,
      savedMedia: context.savedMedia,
      friendships: context.friendships,
      resolvedWatchedMedia,
    })

    const evaluation = evaluateAchievements({
      metrics,
      previous: previousAchievementState(
        context.previous,
      ),
    })

    return store.saveCurrent(uid, evaluation)
  }
}
