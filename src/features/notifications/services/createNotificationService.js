export const NOTIFICATION_REALTIME_LIMIT = 50
const MARK_ALL_BATCH_LIMIT = 400

const NOTIFICATION_TYPES = new Set([
  'friend_request',
  'friend_accepted',
  'achievement_unlocked',
])

export class NotificationServiceError extends Error {
  constructor(code) {
    super(code)
    this.name = 'NotificationServiceError'
    this.code = code
  }
}

function validUid(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
  )
}

function validId(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && value.length <= 500
    && !value.includes('/')
  )
}

function isObject(value) {
  return (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
  )
}

function isTimestamp(value) {
  return (
    isObject(value)
    && (
      typeof value.toDate === 'function'
      || typeof value.toMillis === 'function'
      || typeof value.seconds === 'number'
    )
  )
}

export function normalizeNotificationSnapshot(snapshot) {
  if (!snapshot?.exists?.()) return null

  const data = snapshot.data()

  if (
    !validId(snapshot.id)
    || !isObject(data)
    || data.schemaVersion !== 1
    || !NOTIFICATION_TYPES.has(data.type)
    || !validId(data.entityId)
    || !isObject(data.metadata)
    || !isTimestamp(data.createdAt)
    || !(
      data.readAt === null
      || isTimestamp(data.readAt)
    )
  ) {
    throw new NotificationServiceError(
      'notification/invalid-data',
    )
  }

  if (
    data.type === 'achievement_unlocked'
    ? data.actorUid !== null
    : !validUid(data.actorUid)
  ) {
    throw new NotificationServiceError(
      'notification/invalid-data',
    )
  }

  return {
    id: snapshot.id,
    schemaVersion: data.schemaVersion,
    type: data.type,
    actorUid: data.actorUid,
    entityId: data.entityId,
    metadata: {
      ...data.metadata,
    },
    createdAt: data.createdAt,
    readAt: data.readAt,
  }
}

function mapError(error) {
  if (error instanceof NotificationServiceError) {
    return error
  }

  if (error?.code === 'permission-denied') {
    return new NotificationServiceError(
      'notification/permission-denied',
    )
  }

  if (error?.code === 'unavailable') {
    return new NotificationServiceError(
      'notification/unavailable',
    )
  }

  return new NotificationServiceError(
    'notification/unknown',
  )
}

export function createNotificationService({
  auth,
  db,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
}) {
  function currentSession() {
    const session = auth.currentUser

    if (!validUid(session?.uid)) {
      throw new NotificationServiceError(
        'notification/unauthenticated',
      )
    }

    return session
  }

  function ensureSession(session) {
    if (
      auth.currentUser !== session
      || !validUid(session?.uid)
    ) {
      throw new NotificationServiceError(
        'notification/session-changed',
      )
    }
  }

  function notificationRef(notificationId) {
    const session = currentSession()

    if (!validId(notificationId)) {
      throw new NotificationServiceError(
        'notification/invalid-id',
      )
    }

    return doc(
      db,
      'users',
      session.uid,
      'notifications',
      notificationId,
    )
  }

  function subscribeToNotifications(
    onValue,
    onError,
    {
      maxResults = NOTIFICATION_REALTIME_LIMIT,
    } = {},
  ) {
    try {
      const session = currentSession()

      if (typeof onValue !== 'function') {
        throw new NotificationServiceError(
          'notification/invalid-listener',
        )
      }

      if (
        !Number.isInteger(maxResults)
        || maxResults < 1
        || maxResults > 100
      ) {
        throw new NotificationServiceError(
          'notification/invalid-limit',
        )
      }

      const notificationQuery = query(
        collection(
          db,
          'users',
          session.uid,
          'notifications',
        ),
        orderBy('createdAt', 'desc'),
        limit(maxResults),
      )

      return onSnapshot(
        notificationQuery,
        (snapshot) => {
          if (auth.currentUser !== session) {
            return
          }

          try {
            onValue(
              snapshot.docs
                .map(normalizeNotificationSnapshot)
                .filter(Boolean),
            )
          } catch (error) {
            onError?.(mapError(error))
          }
        },
        (error) => {
          if (auth.currentUser !== session) {
            return
          }

          onError?.(mapError(error))
        },
      )
    } catch (error) {
      throw mapError(error)
    }
  }

  async function loadNotificationsPage({
    pageSize = 25,
    cursor = null,
  } = {}) {
    try {
      const session = currentSession()

      if (
        !Number.isInteger(pageSize)
        || pageSize < 1
        || pageSize > 50
      ) {
        throw new NotificationServiceError(
          'notification/invalid-limit',
        )
      }

      const constraints = [
        orderBy('createdAt', 'desc'),
      ]

      if (cursor) {
        constraints.push(
          startAfter(cursor),
        )
      }

      constraints.push(
        limit(pageSize),
      )

      const snapshot = await getDocs(
        query(
          collection(
            db,
            'users',
            session.uid,
            'notifications',
          ),
          ...constraints,
        ),
      )

      ensureSession(session)

      const notifications = snapshot.docs
        .map(normalizeNotificationSnapshot)
        .filter(Boolean)

      return {
        notifications,
        cursor:
          snapshot.docs.at(-1) ?? null,
        hasMore:
          snapshot.size === pageSize,
      }
    } catch (error) {
      throw mapError(error)
    }
  }

  async function markAsRead(notificationId) {
    try {
      await updateDoc(
        notificationRef(notificationId),
        {
          readAt: serverTimestamp(),
        },
      )
    } catch (error) {
      throw mapError(error)
    }
  }

  async function markAsUnread(notificationId) {
    try {
      await updateDoc(
        notificationRef(notificationId),
        {
          readAt: null,
        },
      )
    } catch (error) {
      throw mapError(error)
    }
  }

  async function markAllAsRead() {
    try {
      const session = currentSession()
      let updatedCount = 0

      while (true) {
        ensureSession(session)

        const unreadQuery = query(
          collection(
            db,
            'users',
            session.uid,
            'notifications',
          ),
          where('readAt', '==', null),
          limit(MARK_ALL_BATCH_LIMIT),
        )

        const snapshot = await getDocs(
          unreadQuery,
        )

        ensureSession(session)

        if (snapshot.empty) {
          return updatedCount
        }

        const batch = writeBatch(db)

        for (const notification of snapshot.docs) {
          batch.update(
            notification.ref,
            {
              readAt: serverTimestamp(),
            },
          )
        }

        await batch.commit()

        updatedCount += snapshot.size
      }
    } catch (error) {
      throw mapError(error)
    }
  }

  return {
    subscribeToNotifications,
    loadNotificationsPage,
    markAsRead,
    markAsUnread,
    markAllAsRead,
  }
}
