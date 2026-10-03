import {
  doc,
  onSnapshot,
} from 'firebase/firestore'

import { db } from '../../../shared/config/firebase.js'

import {
  createAchievementService,
} from './createAchievementService.js'

export const achievementService =
  createAchievementService({
    database: db,
    document: doc,
    subscribe: onSnapshot,
  })
