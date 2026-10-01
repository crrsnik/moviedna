import { FieldValue } from 'firebase-admin/firestore'

export function createFirestorePublicBoardStore(db) {
  const user = uid => db.collection('users').doc(uid)

  const privateList = (uid, listId) => (
    user(uid).collection('lists').doc(listId)
  )

  const privateMedia = (uid, mediaKey) => (
    user(uid).collection('savedMedia').doc(mediaKey)
  )

  const board = (uid, listId) => (
    db
      .collection('publicBoards')
      .doc(uid)
      .collection('boards')
      .doc(listId)
  )

  const item = (uid, listId, mediaKey) => (
    board(uid, listId)
      .collection('items')
      .doc(mediaKey)
  )

  return {
    async loadList(uid, listId) {
      const snapshot = await privateList(uid, listId).get()

      return snapshot.exists
        ? snapshot.data()
        : null
    },

    async loadListItems(uid, listId) {
      const snapshot = await user(uid)
        .collection('savedMedia')
        .where('listIds', 'array-contains', listId)
        .get()

      return snapshot.docs.map(document => ({
        id: document.id,
        ...document.data(),
      }))
    },

    async loadSavedMedia(uid, mediaKey) {
      const snapshot = await privateMedia(
        uid,
        mediaKey,
      ).get()

      return snapshot.exists
        ? snapshot.data()
        : null
    },

    async replaceBoard(
      uid,
      listId,
      value,
      items,
    ) {
      const reference = board(uid, listId)

      await db.recursiveDelete(reference)

      await reference.set({
        ...value,
        updatedAt: FieldValue.serverTimestamp(),
      })

      if (!items.length) return

      const writer = db.bulkWriter()

      for (const entry of items) {
        writer.set(
          item(uid, listId, entry.mediaKey),
          {
            ...entry.value,
            updatedAt: FieldValue.serverTimestamp(),
          },
        )
      }

      await writer.close()
    },

    async writeItem(
      uid,
      listId,
      mediaKey,
      value,
    ) {
      await item(uid, listId, mediaKey).set({
        ...value,
        updatedAt: FieldValue.serverTimestamp(),
      })
    },

    async deleteItem(
      uid,
      listId,
      mediaKey,
    ) {
      await item(uid, listId, mediaKey).delete()
    },

    async deleteBoard(uid, listId) {
      await db.recursiveDelete(
        board(uid, listId),
      )
    },
  }
}
