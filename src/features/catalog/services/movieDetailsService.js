import { getTmdb } from './tmdbClient.js'
import { normalizeMovieDetails } from './normalizeMovieDetails.js'
import { isValidMovieId } from '../validation/detailRouteValidation.js'
import { TmdbError } from './tmdbErrors.js'
export async function getMovieDetails({ movieId, signal } = {}) {
  if (!isValidMovieId(movieId)) throw new TmdbError('missing')
  const data = await getTmdb(`/movie/${movieId}`, { signal, details: true })
  const movie = normalizeMovieDetails(data)
  if (movie.id !== Number(movieId)) throw new TmdbError('invalid')
  return movie
}
