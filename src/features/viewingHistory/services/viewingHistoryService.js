import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'

import {
  auth,
  db,
} from '../../../shared/config/firebase.js'

import {
  createViewingHistoryService,
} from './createViewingHistoryService.js'

export const viewingHistoryService =
  createViewingHistoryService({
    auth,
    db,
    doc,
    collection,
    onSnapshot,
    runTransaction,
    serverTimestamp,
  })
