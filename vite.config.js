import { isAllowedMovieDetailRequest, isAllowedTvDetailRequest, isAllowedPersonDetailRequest, isAllowedMediaSummaryRequest } from './src/features/catalog/validation/detailRouteValidation.js'
import { isAllowedBrowseRequest } from './src/features/catalog/validation/browseValidation.js'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import { isAllowedSearchRequest } from './src/features/catalog/validation/searchValidation.js'
import { isTmdbLanguage } from './src/shared/config/tmdb.js'

// https://vite.dev/config/
export default defineConfig(({ command, mode, isPreview }) => {
  const productionBuild = command !== 'serve' || isPreview
  const localFirebaseMode = process.env.VITE_MOVIEDNA_LOCAL === 'true' || mode === 'emulator'
  const debugModule = productionBuild
    ? './src/shared/config/firebaseAppCheckDebug.production.js'
    : './src/shared/config/firebaseAppCheckDebug.js'
  const tokenModule = productionBuild
    ? './src/features/catalog/services/tmdbAppCheckToken.production.js'
    : './src/features/catalog/services/tmdbAppCheckToken.js'
  const firebaseRuntimeModule = localFirebaseMode && !productionBuild
    ? './src/shared/config/firebaseRuntime.local.js'
    : './src/shared/config/firebaseRuntime.production.js'
  const config = {
    plugins: [react(), tailwindcss()],
    resolve: { alias: {
      '#firebase-app-check-debug': fileURLToPath(new URL(debugModule, import.meta.url)),
      '#tmdb-app-check-token': fileURLToPath(new URL(tokenModule, import.meta.url)),
      '#firebase-runtime': fileURLToPath(new URL(firebaseRuntimeModule, import.meta.url)),
    } },
  }
  // Static builds and preview never require or expose the private API token.
  if (productionBuild) return config
  const { TMDB_READ_ACCESS_TOKEN: token } = loadEnv(mode, process.cwd(), '')
  if (!token?.trim()) throw new Error('TMDB_READ_ACCESS_TOKEN is required for npm run dev. Set it in .env.local.')

  config.server = {
    proxy: {
      '^/api/tmdb(?:/|$)': {
        target: 'https://api.themoviedb.org',
        changeOrigin: true,
        secure: true,
        followRedirects: false,
        rewrite: (path) => path.replace(/^\/api\/tmdb/, '/3'),
        bypass(req, res) {
          const url = new URL(req.url, 'http://localhost')
          const allowedPath = /^\/api\/tmdb\/trending\/(movie|tv)\/day$/.test(url.pathname)
          const allowedQuery = [...url.searchParams].length === 1
            && url.searchParams.getAll('language').length === 1
            && isTmdbLanguage(url.searchParams.get('language'))
          if (req.method !== 'GET' || !((allowedPath && allowedQuery) || isAllowedSearchRequest(url) || isAllowedBrowseRequest(url) || isAllowedMovieDetailRequest(url) || isAllowedTvDetailRequest(url) || isAllowedPersonDetailRequest(url) || isAllowedMediaSummaryRequest(url))) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Unsupported catalog request' }))
            return false
          }
        },
        configure(proxy) {
          proxy.on('proxyReq', (request) => {
            request.setHeader('Authorization', `Bearer ${token}`)
            request.setHeader('Accept', 'application/json')
            request.removeHeader('cookie')
          })
        },
      },
    },
  }
  return config
})
