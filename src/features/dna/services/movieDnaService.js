import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../shared/config/firebase.js'
import { createMovieDnaService } from './createMovieDnaService.js'

export const movieDnaService = createMovieDnaService({ database: db, document: doc, subscribe: onSnapshot })
