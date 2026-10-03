const DELETE_BATCH_SIZE = 400

function uniqueRefs(refs) {
  return [
    ...new Map(
      refs.map(ref => [
        ref.path,
        ref,
      ]),
    ).values(),
  ]
}

async function deleteRefs(db, refs) {
  const unique = uniqueRefs(refs)

  for (
    let offset = 0;
    offset < unique.length;
    offset += DELETE_BATCH_SIZE
  ) {
    const batch = db.batch()

    for (
      const ref
      of unique.slice(
        offset,
        offset + DELETE_BATCH_SIZE,
      )
    ) {
      batch.delete(ref)
    }

    await batch.commit()
  }
}

async function deleteDocumentTree(
  db,
  documentRef,
  {
    deleteRoot = true,
  } = {},
) {
  const children = await documentRef.listCollections()

  for (const collection of children) {
    await db.recursiveDelete(collection)
  }

  if (deleteRoot) {
    await documentRef.delete()
  }
}

export function createFirestoreAccountDeletionStore(
  db,
) {
  return {
    async deleteUserData(uid) {
      const userRef = db
        .collection('users')
        .doc(uid)

      /*
       * Read child collection handles before deleting
       * the root profile.
       */
      const userCollections = (
        await userRef.listCollections()
      )

      /*
       * Delete the root profile first.
       *
       * Firestore background triggers use this as the
       * account-existence guard, so deleting source
       * documents below cannot recreate derived data.
       */
      await userRef.delete()

      const [
        usernameReservations,
        friendships,
        allComments,
      ] = await Promise.all([
        db
          .collection('usernames')
          .where('userId', '==', uid)
          .get(),

        db
          .collection('friendships')
          .where(
            'members',
            'array-contains',
            uid,
          )
          .get(),

        db
          .collectionGroup('comments')
          .get(),
      ])

      const externalRefs = [
        ...usernameReservations.docs.map(
          document => document.ref,
        ),

        ...friendships.docs.map(
          document => document.ref,
        ),

        ...allComments.docs
          .filter(
            document => document.id === uid,
          )
          .map(document => document.ref),

        db
          .collection('publicProfiles')
          .doc(uid),

        db
          .collection('publicProfilePreviews')
          .doc(uid),
      ]

      /*
       * The publicBoards parent document may not exist
       * physically while its boards subcollection does.
       */
      const publicBoardsRef = db
        .collection('publicBoards')
        .doc(uid)

      await Promise.all([
        ...userCollections.map(
          collection => (
            db.recursiveDelete(collection)
          ),
        ),

        deleteDocumentTree(
          db,
          publicBoardsRef,
        ),

        deleteRefs(
          db,
          externalRefs,
        ),
      ])

      /*
       * One final sweep makes cleanup idempotent if a
       * previously running trigger completed while the
       * deletion was in progress.
       */
      const remainingCollections = (
        await userRef.listCollections()
      )

      for (const collection of remainingCollections) {
        await db.recursiveDelete(collection)
      }
    },
  }
}
