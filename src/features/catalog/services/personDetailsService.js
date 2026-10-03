import { getTmdb } from './tmdbClient.js'
import { normalizePersonDetails } from './normalizePersonDetails.js'
import { isValidPersonId } from '../validation/detailRouteValidation.js'
import { TmdbError } from './tmdbErrors.js'
import { TMDB_DEFAULT_LANGUAGE } from '../../../shared/config/tmdb.js'
export async function getPersonDetails({ personId, language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
  if (!isValidPersonId(personId)) throw new TmdbError('missing')
  const raw = await getTmdb(`/person/${personId}`, { language, signal, details: true })
  const person = normalizePersonDetails(raw)
  if (person.id !== Number(personId)) throw new TmdbError('invalid')
  return person
}
