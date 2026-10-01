import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

import {
  auth,
  db,
} from '../../../shared/config/firebase.js'

import {
  createFriendshipService,
} from './createFriendshipService.js'

export const friendshipService = createFriendshipService({
  auth,
  db,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
})
