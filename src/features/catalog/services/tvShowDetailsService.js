import { getTmdb } from './tmdbClient.js'
import { normalizeTvShowDetails } from './normalizeTvShowDetails.js'
import { isValidSeriesId } from '../validation/detailRouteValidation.js'
import { TmdbError } from './tmdbErrors.js'
export async function getTvShowDetails({ seriesId, signal } = {}) {
  if (!isValidSeriesId(seriesId)) throw new TmdbError('missing')
  const raw = await getTmdb(`/tv/${seriesId}`, { signal, details: true })
  const series = normalizeTvShowDetails(raw)
  if (series.id !== Number(seriesId)) throw new TmdbError('invalid')
  return series
}
