import { TmdbError } from './tmdbErrors.js'

export async function getCatalogAppCheckToken() {
  throw new TmdbError('access')
}
