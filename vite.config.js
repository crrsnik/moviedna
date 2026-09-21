import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode, isPreview }) => {
  const config = { plugins: [react(), tailwindcss()] }
  // Static builds and preview never require or expose the private API token.
  if (command !== 'serve' || isPreview) return config
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
          const allowedQuery = [...url.searchParams].every(([key, value]) => key === 'language' && /^[a-z]{2}-[A-Z]{2}$/.test(value))
          if (req.method !== 'GET' || !allowedPath || !allowedQuery) {
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
