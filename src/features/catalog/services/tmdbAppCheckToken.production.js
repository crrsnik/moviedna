import { getToken } from 'firebase/app-check'

import { appCheck } from '../../../shared/config/firebase.js'
import { TmdbError } from './tmdbErrors.js'

export async function getCatalogAppCheckToken() {
  try {
    const result = await getToken(appCheck, false)
    if (typeof result?.token !== 'string' || !result.token) throw new Error('missing token')
    return result.token
  } catch {
    throw new TmdbError('access')
  }
}
