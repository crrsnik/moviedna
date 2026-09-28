import { doc, collection, query, orderBy, limit, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../../shared/config/firebase.js'
import { createCommentService } from './createCommentService.js'
export const commentService = createCommentService({ auth, db, doc, collection, query, orderBy, limit, onSnapshot, runTransaction, serverTimestamp })
