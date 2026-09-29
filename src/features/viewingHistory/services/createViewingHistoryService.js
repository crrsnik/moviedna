import {
  normalizeViewingEvent,
  normalizeViewingHistory,
} from './normalizeViewingHistory.js'

import {
  toViewingHistoryError,
  ViewingHistoryError,
} from './viewingHistoryErrors.js'

import {
  validateViewingEventId,
  validateWatchedDate,
  viewingHistoryMediaSnapshot,
} from '../validation/viewingHistoryValidation.js'

export function createViewingHistoryService({
  auth,
  db,
  doc,
  collection,
  onSnapshot,
  runTransaction,
  serverTimestamp,
}) {
  const pending = new Map()
  const subscriptions = new Map()

  function owner(uid, session = auth.currentUser) {
    if (
      typeof uid !== 'string'
      || !uid
      || uid.includes('/')
      || !session
      || session.uid !== uid
    ) {
      throw new ViewingHistoryError('unauthenticated')
    }

    if (auth.currentUser !== session) {
      throw new ViewingHistoryError('session')
    }

    return session
  }

  const historyRef = uid => (
    collection(db, 'users', uid, 'viewingHistory')
  )

  const eventRef = (uid, eventId) => (
    doc(
      db,
      'users',
      uid,
      'viewingHistory',
      validateViewingEventId(eventId),
    )
  )

  function subscribe(uid, next, error) {
    let active = true
    let generation = 0
    let stop = () => {}

    const session = auth.currentUser

    const connect = () => {
      if (!active) return

      const current = ++generation
      stop()

      const fail = failure => {
        if (active && generation === current) {
          error(toViewingHistoryError(failure))
        }
      }

      try {
        owner(uid, session)

        stop = onSnapshot(
          historyRef(uid),
          { includeMetadataChanges: true },
          snapshot => {
            if (!active || generation !== current) return

            try {
              owner(uid, session)

              if (
                [...pending.values()].includes(uid)
                || snapshot.metadata?.hasPendingWrites
                || snapshot.metadata?.fromCache
              ) {
                return
              }

              next(normalizeViewingHistory(snapshot))
            } catch (failure) {
              fail(failure)
            }
          },
          fail,
        )
      } catch (failure) {
        fail(failure)
      }
    }

    if (!subscriptions.has(uid)) {
      subscriptions.set(uid, new Set())
    }

    subscriptions.get(uid).add(connect)
    connect()

    return () => {
      active = false
      generation += 1
      stop()

      subscriptions.get(uid)?.delete(connect)

      if (!subscriptions.get(uid)?.size) {
        subscriptions.delete(uid)
      }
    }
  }

  async function mutate(uid, target, operation) {
    let lock

    try {
      const session = owner(uid)
      const eventId = validateViewingEventId(target.id)

      lock = `${uid}:${eventId}`

      if (pending.has(lock)) {
        throw new ViewingHistoryError('pending')
      }

      pending.set(lock, uid)

      await runTransaction(db, async transaction => {
        owner(uid, session)

        await operation(
          transaction,
          target,
          session,
        )
      })

      owner(uid, session)

      return eventId
    } catch (failure) {
      throw toViewingHistoryError(failure)
    } finally {
      if (lock) {
        pending.delete(lock)

        for (const refresh of subscriptions.get(uid) ?? []) {
          refresh()
        }
      }
    }
  }

  return {
    subscribeToHistory(uid, next, error) {
      return subscribe(uid, next, error)
    },

    async addViewing(uid, input, watchedDate) {
      owner(uid)

      const media = viewingHistoryMediaSnapshot(input)
      validateWatchedDate(watchedDate)

      const target = doc(historyRef(uid))
      validateViewingEventId(target.id)

      return mutate(
        uid,
        target,
        async (transaction, reference, session) => {
          const profile = await transaction.get(
            doc(db, 'users', uid),
          )

          owner(uid, session)

          if (
            !profile.exists()
            || profile.data()?.onboardingCompleted !== true
          ) {
            throw new ViewingHistoryError(
              'incomplete-profile',
            )
          }

          transaction.set(reference, {
            schemaVersion: 1,
            ...media,
            watchedDate,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        },
      )
    },

    updateViewingDate(uid, eventId, watchedDate) {
      validateWatchedDate(watchedDate)

      const target = eventRef(uid, eventId)

      return mutate(
        uid,
        target,
        async (transaction, reference, session) => {
          const existing = await transaction.get(reference)

          owner(uid, session)

          if (!existing.exists()) {
            throw new ViewingHistoryError('not-found')
          }

          normalizeViewingEvent(existing)

          transaction.update(reference, {
            watchedDate,
            updatedAt: serverTimestamp(),
          })
        },
      )
    },

    deleteViewing(uid, eventId) {
      const target = eventRef(uid, eventId)

      return mutate(
        uid,
        target,
        async (transaction, reference, session) => {
          const existing = await transaction.get(reference)

          owner(uid, session)

          if (existing.exists()) {
            normalizeViewingEvent(existing)
            transaction.delete(reference)
          }
        },
      )
    },
  }
}
