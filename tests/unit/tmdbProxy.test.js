import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import configFactory from '../../vite.config.js'

let cwd, dir, originalToken
before(async () => {
  cwd = process.cwd()
  dir = await mkdtemp(join(tmpdir(), 'moviedna-config-test-'))
  originalToken = process.env.TMDB_READ_ACCESS_TOKEN
  process.chdir(dir)
  process.env.TMDB_READ_ACCESS_TOKEN = 'synthetic-test-token'
})
after(async () => {
  process.chdir(cwd)
  if (originalToken === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN
  else process.env.TMDB_READ_ACCESS_TOKEN = originalToken
  await rm(dir, { recursive: true })
})
const dev = () => configFactory({ command: 'serve', mode: 'development' }).server.proxy['^/api/tmdb(?:/|$)']

describe('Local TMDB proxy configuration with a synthetic token', () => {
  it('preserves plugins and a fixed verified HTTPS target without redirects', () => {
    const proxy = dev()
    assert.equal(proxy.target, 'https://api.themoviedb.org')
    assert.equal(proxy.secure, true)
    assert.equal(proxy.changeOrigin, true)
    assert.equal(proxy.followRedirects, false)
    assert.equal(proxy.rewrite('/api/tmdb/trending/movie/day?language=en-US'), '/3/trending/movie/day?language=en-US')
    assert.equal(configFactory({ command: 'build', mode: 'production' }).plugins.length, 2)
  })
  it('injects credentials only into the upstream request and strips cookies', () => {
    let listener
    dev().configure({ on(event, callback) { assert.equal(event, 'proxyReq'); listener = callback } })
    const headers = { cookie: 'synthetic cookie' }
    listener({ setHeader(k, v) { headers[k] = v }, removeHeader(k) { delete headers[k] } })
    assert.deepEqual(headers, { Authorization: 'Bearer synthetic-test-token', Accept: 'application/json' })
  })
  it('allows expected localized Trending GET requests', () => {
    for (const type of ['movie', 'tv']) {
      for (const language of ['en-US', 'fr-FR', 'ru-RU']) {
        assert.equal(
          dev().bypass(
            {
              method: 'GET',
              url: `/api/tmdb/trending/${type}/day?language=${language}`,
            },
            {},
          ),
          undefined,
        )
      }
    }
  })


  it('allows lightweight localized movie and TV summaries', () => {
    for (const url of [
      '/api/tmdb/movie/1?language=en-US',
      '/api/tmdb/movie/1?language=fr-FR',
      '/api/tmdb/tv/1?language=ru-RU',
    ]) {
      assert.equal(
        dev().bypass(
          {
            method: 'GET',
            url,
          },
          {},
        ),
        undefined,
      )
    }
  })
  for (const request of [
    { method: 'POST', url: '/api/tmdb/trending/movie/day' },
    { method: 'GET', url: '/api/tmdb/account' },
    { method: 'GET', url: '/api/tmdb/trending/movie/day?target=https://example.invalid' },
    { method: 'GET', url: '/api/tmdb/trending/movie/day?api_key=synthetic' },
    { method: 'GET', url: '/api/tmdb/trending/movie/day?language=de-DE' },
  ]) {
    it(`blocks ${request.method} ${request.url}`, () => {
      let status, body
      const result = dev().bypass(request, { writeHead(code) { status = code }, end(value) { body = value } })
      assert.equal(result, false)
      assert.equal(status, 400)
      assert.ok(!body.includes('synthetic-test-token'))
    })
  }
  it('requires a token only for dev; build and preview work without it', () => {
    process.env.TMDB_READ_ACCESS_TOKEN = ''
    try {
      assert.throws(dev, /TMDB_READ_ACCESS_TOKEN is required/)
      assert.equal(configFactory({ command: 'build', mode: 'production' }).server, undefined)
      assert.equal(configFactory({ command: 'serve', mode: 'production', isPreview: true }).server, undefined)
    } finally { process.env.TMDB_READ_ACCESS_TOKEN = 'synthetic-test-token' }
  })
})
