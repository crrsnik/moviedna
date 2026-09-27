import { doc, collection, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../../shared/config/firebase.js'
import { createRatingService } from './createRatingService.js'
export const ratingService = createRatingService({ auth, db, doc, collection, onSnapshot, runTransaction, serverTimestamp })
