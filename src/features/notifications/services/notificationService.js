import {
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
} from 'firebase/firestore'

import {
  auth,
  db,
} from '../../../shared/config/firebase.js'

import {
  createNotificationService,
} from './createNotificationService.js'

export const notificationService =
  createNotificationService({
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
  })
