import { FieldValue } from 'firebase-admin/firestore'

import {
  buildAchievementDocument,
} from './achievementDocument.js'

function documents(snapshot) {
  return snapshot.docs.map(document => ({
    id: document.id,
    ...document.data(),
  }))
}

export function createFirestoreAchievementStore(db) {
  const user = uid => db.collection('users').doc(uid)

  async function loadContext(uid) {
    const reference = user(uid)

    const [
      profile,
      dna,
      ratings,
      savedMedia,
      friendships,
      current,
    ] = await Promise.all([
      reference.get(),
      reference.collection('movieDna').doc('current').get(),
      reference.collection('ratings').get(),
      reference.collection('savedMedia').get(),
      db.collection('friendships')
        .where('members', 'array-contains', uid)
        .get(),
      reference.collection('achievements').doc('current').get(),
    ])

    return {
      uid,
      profile: profile.exists ? profile.data() : null,
      dna: dna.exists ? dna.data() : null,
      ratings: documents(ratings),
      savedMedia: documents(savedMedia),
      friendships: documents(friendships),
      previous: current.exists ? current.data() : null,
    }
  }

  async function saveCurrent(uid, evaluation) {
    const reference = user(uid)
      .collection('achievements')
      .doc('current')

    return db.runTransaction(async transaction => {
      const existing = await transaction.get(reference)

      const document = buildAchievementDocument({
        evaluation,
        previousAchievements:
          existing.data()?.achievements,
        serverTimestamp:
          () => FieldValue.serverTimestamp(),
      })

      transaction.set(reference, document)

      return {
        status: 'updated',
        completedCount: document.completedCount,
        totalCount: document.totalCount,
      }
    })
  }

  return {
    loadContext,
    saveCurrent,
  }
}
