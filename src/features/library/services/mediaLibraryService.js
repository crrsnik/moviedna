import { doc, collection, query, where, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../../shared/config/firebase.js'
import { createMediaLibraryService } from './createMediaLibraryService.js'
export const mediaLibraryService = createMediaLibraryService({ auth, db, doc, collection, query, where, onSnapshot, runTransaction, serverTimestamp })
