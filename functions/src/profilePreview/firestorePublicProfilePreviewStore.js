import { FieldValue } from 'firebase-admin/firestore'

export function createFirestorePublicProfilePreviewStore(db) {
  const user = (uid) => db.collection('users').doc(uid)
  const preview = (uid) => db.collection('publicProfilePreviews').doc(uid)

  return {
    async loadMovieDna(uid) {
      const snapshot = await user(uid)
        .collection('movieDna')
        .doc('current')
        .get()

      return snapshot.exists
        ? snapshot.data()
        : null
    },

    async loadViewingHistory(uid) {
      const snapshot = await user(uid)
        .collection('viewingHistory')
        .get()

      return snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }))
    },

    async mergePreview(uid, value) {
      await preview(uid).set({
        schemaVersion: 1,
        ...value,
        updatedAt: FieldValue.serverTimestamp(),
      }, {
        merge: true,
      })
    },

    async writePreview(uid, value) {
      await preview(uid).set({
        ...value,
        updatedAt: FieldValue.serverTimestamp(),
      })
    },

    async deletePreview(uid) {
      await preview(uid).delete()
    },
  }
}
