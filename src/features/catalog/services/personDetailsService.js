import { getTmdb } from './tmdbClient.js'
import { normalizePersonDetails } from './normalizePersonDetails.js'
import { isValidPersonId } from '../validation/detailRouteValidation.js'
import { TmdbError } from './tmdbErrors.js'
export async function getPersonDetails({ personId, signal } = {}) {
  if (!isValidPersonId(personId)) throw new TmdbError('missing')
  const raw = await getTmdb(`/person/${personId}`, { signal, details: true })
  const person = normalizePersonDetails(raw)
  if (person.id !== Number(personId)) throw new TmdbError('invalid')
  return person
}
