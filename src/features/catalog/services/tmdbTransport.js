import { TmdbError } from './tmdbErrors.js'
import { getCatalogAppCheckToken } from '#tmdb-app-check-token'

export function createTmdbTransport({
  production = typeof window !== 'undefined' && import.meta.env.PROD,
  tokenProvider = getCatalogAppCheckToken,
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  return {
    async request(url, options = {}) {
      const headers = { ...options.headers }
      if (production) {
        let token
        try {
          token = await tokenProvider()
        } catch {
          throw new TmdbError('access')
        }
        if (typeof token !== 'string' || !token) throw new TmdbError('access')
        headers['X-Firebase-AppCheck'] = token
      }
      return fetchImpl(url, { ...options, headers })
    },
  }
}

export const tmdbTransport = createTmdbTransport()
