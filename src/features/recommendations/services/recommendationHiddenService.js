import {
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import {
  auth,
  db,
} from '../../../shared/config/firebase.js'


const MEDIA_KEY_PATTERN = /^(movie|tv)_([1-9]\d{0,11})$/


function recommendationIdentity(recommendation) {
  const mediaKey = recommendation?.mediaKey
  const match = typeof mediaKey === 'string'
    ? mediaKey.match(MEDIA_KEY_PATTERN)
    : null

  if (!match) {
    throw new TypeError(
      'Invalid recommendation identity.',
    )
  }

  const mediaType = match[1]
  const tmdbId = Number(match[2])

  if (
    recommendation.mediaType !== mediaType
    || recommendation.tmdbId !== tmdbId
  ) {
    throw new TypeError(
      'Invalid recommendation identity.',
    )
  }

  return {
    mediaKey,
    mediaType,
    tmdbId,
  }
}


export const recommendationHiddenService = Object.freeze({
  async hide(recommendation) {
    const uid = auth.currentUser?.uid

    if (!uid) {
      throw new Error(
        'Authentication is required.',
      )
    }

    const identity = recommendationIdentity(
      recommendation,
    )

    await setDoc(
      doc(
        db,
        'users',
        uid,
        'hiddenRecommendations',
        identity.mediaKey,
      ),
      {
        tmdbId: identity.tmdbId,
        mediaType: identity.mediaType,
        hiddenAt: serverTimestamp(),
      },
    )

    return identity.mediaKey
  },
})
