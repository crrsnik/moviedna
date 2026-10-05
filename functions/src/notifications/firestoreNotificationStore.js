import { FieldValue } from 'firebase-admin/firestore'

import {
  buildNotificationDocument,
} from './notificationDocument.js'

function validUid(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
  )
}

export function createFirestoreNotificationStore(db) {
  async function create({
    uid,
    type,
    actorUid,
    entityId,
    metadata = {},
  }) {
    if (!validUid(uid)) {
      throw new TypeError('Invalid notification recipient')
    }

    const {
      id,
      document,
    } = buildNotificationDocument({
      type,
      actorUid,
      entityId,
      metadata,
      serverTimestamp:
        () => FieldValue.serverTimestamp(),
    })

    const userReference = db
      .collection('users')
      .doc(uid)

    const notificationReference = userReference
      .collection('notifications')
      .doc(id)

    return db.runTransaction(async transaction => {
      const user = await transaction.get(userReference)

      if (!user.exists) {
        return {
          status: 'account-deleted',
          id,
        }
      }

      const existing = await transaction.get(
        notificationReference,
      )

      if (existing.exists) {
        return {
          status: 'exists',
          id,
        }
      }

      transaction.set(
        notificationReference,
        document,
      )

      return {
        status: 'created',
        id,
      }
    })
  }

  return {
    create,
  }
}
