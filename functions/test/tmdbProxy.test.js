import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createTmdbProxyHandler } from '../src/proxy/createTmdbProxyHandler.js'
import { validateTmdbProxyRequest } from '../src/proxy/tmdbProxyContract.js'

const allowedUrl = '/api/tmdb/search/movie?query=Alien&language=en-US&page=1&include_adult=false'

function upstream(status = 200, payload = { page: 1, results: [] }, contentType = 'application/json') {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': contentType } })
}

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    set(name, value) { this.headers[name.toLowerCase()] = value; return this },
    status(value) { this.statusCode = value; return this },
    json(value) { this.body = value; return this },
  }
}

function request(overrides = {}) {
  return {
    method: 'GET', originalUrl: allowedUrl,
    headers: { 'x-firebase-appcheck': 'synthetic-app-check-token' },
    ...overrides,
  }
}

function setup(overrides = {}) {
  const calls = []
  const handler = createTmdbProxyHandler({
    verifyAppCheck: async () => ({ app_id: 'synthetic-app' }),
    getSecret: () => 'synthetic-tmdb-token',
    fetchImpl: async (...args) => { calls.push(args); return upstream() },
    timeoutMs: 20,
    ...overrides,
  })
  return { handler, calls }
}

async function run(handler, req = request()) {
  const res = responseRecorder()
  await handler(req, res)
  return res
}

describe('TMDB proxy request contract', () => {
  it('allows the exact MovieDNA inventory', () => {
    const urls = [
      '/api/tmdb/trending/movie/day?language=en-US',
      '/api/tmdb/trending/tv/day?language=en-US',
      allowedUrl,
      '/api/tmdb/movie/popular?language=en-US&page=2',
      '/api/tmdb/tv/on_the_air?language=en-US&page=2',
      '/api/tmdb/person/popular?language=en-US&page=2',
      '/api/tmdb/trending/person/week?language=en-US&page=2',
      '/api/tmdb/genre/movie/list?language=en-US',
      '/api/tmdb/genre/tv/list?language=en-US',
      '/api/tmdb/discover/movie?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=28&include_video=false',
      '/api/tmdb/discover/tv?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=18&include_null_first_air_dates=false',
      '/api/tmdb/movie/1?language=en-US&append_to_response=credits%2Cvideos%2Crelease_dates%2Crecommendations',
      '/api/tmdb/tv/1?language=en-US&append_to_response=aggregate_credits%2Cvideos%2Ccontent_ratings%2Crecommendations',
      '/api/tmdb/person/1?language=en-US&append_to_response=combined_credits%2Cimages%2Cexternal_ids',
    ]
    for (const url of urls) assert.ok(validateTmdbProxyRequest(url))
  })

  for (const [name, url] of [
    ['unknown path', '/api/tmdb/account?language=en-US'],
    ['invalid media ID', '/api/tmdb/movie/01?language=en-US&append_to_response=credits%2Cvideos%2Crelease_dates%2Crecommendations'],
    ['invalid page', '/api/tmdb/movie/popular?language=en-US&page=501'],
    ['long query', `/api/tmdb/search/movie?query=${'a'.repeat(101)}&language=en-US&page=1&include_adult=false`],
    ['adult bypass', '/api/tmdb/search/movie?query=Alien&language=en-US&page=1&include_adult=true'],
    ['unknown parameter', `${allowedUrl}&target=elsewhere`],
    ['duplicate parameter', `${allowedUrl}&page=2`],
    ['external URL', 'https://example.invalid/api/tmdb/search/movie?query=Alien&language=en-US&page=1&include_adult=false'],
    ['hostname path', '/api/tmdb/https://example.invalid?language=en-US'],
    ['protocol-relative URL', '//api.themoviedb.org/3/movie/popular?language=en-US&page=1'],
    ['encoded slash', '/api/tmdb/movie%2Fpopular?language=en-US&page=1'],
    ['encoded backslash', '/api/tmdb/movie%5Cpopular?language=en-US&page=1'],
    ['double-encoded slash', '/api/tmdb/movie%252Fpopular?language=en-US&page=1'],
    ['dot segment', '/api/tmdb/movie/../movie/popular?language=en-US&page=1'],
    ['encoded dot segment', '/api/tmdb/movie/%2e%2e/movie/popular?language=en-US&page=1'],
    ['repeated slash', '/api/tmdb//movie/popular?language=en-US&page=1'],
    ['null byte', '/api/tmdb/movie/%00popular?language=en-US&page=1'],
    ['mixed case path', '/api/tmdb/Movie/popular?language=en-US&page=1'],
    ['trailing slash', '/api/tmdb/movie/popular/?language=en-US&page=1'],
    ['suffix path', '/api/tmdb/movie/popular.json?language=en-US&page=1'],
    ['at-sign path', '/api/tmdb/movie@api.themoviedb.org/popular?language=en-US&page=1'],
    ['colon path', '/api/tmdb/https:api.themoviedb.org?language=en-US'],
    ['backslash path', '/api/tmdb/movie\\popular?language=en-US&page=1'],
    ['question-mark path injection', '/api/tmdb/movie?popular&language=en-US&page=1'],
    ['fragment', `${allowedUrl}#ignored`],
    ['malformed percent', '/api/tmdb/movie/%E0%A4%A?language=en-US&page=1'],
    ['prefix confusion', '/api/tmdbx/movie/popular?language=en-US&page=1'],
  ]) {
    it(`rejects ${name}`, () => assert.equal(validateTmdbProxyRequest(url), null))
  }
  it('rejects non-GET methods', () => assert.equal(validateTmdbProxyRequest(allowedUrl, 'POST'), null))

  it('rejects arbitrary detail append values', () => {
    assert.equal(validateTmdbProxyRequest('/api/tmdb/movie/1?language=en-US&append_to_response=credits%2Caccount_states'), null)
  })

  it('accepts only canonical normalized Unicode search queries', () => {
    const composed = '/api/tmdb/search/movie?query=Caf%C3%A9&language=en-US&page=1&include_adult=false'
    const decomposed = '/api/tmdb/search/movie?query=Cafe%CC%81&language=en-US&page=1&include_adult=false'
    const unicodeWhitespace = '/api/tmdb/search/movie?query=Star%E2%80%83Wars&language=en-US&page=1&include_adult=false'
    assert.ok(validateTmdbProxyRequest(composed))
    assert.equal(validateTmdbProxyRequest(decomposed), null)
    assert.equal(validateTmdbProxyRequest(unicodeWhitespace), null)
  })

  for (const [name, suffix] of [
    ['missing query', 'language=en-US&page=1&include_adult=false'],
    ['empty query', 'query=&language=en-US&page=1&include_adult=false'],
    ['one-character query', 'query=a&language=en-US&page=1&include_adult=false'],
    ['zero page', 'query=Alien&language=en-US&page=0&include_adult=false'],
    ['negative page', 'query=Alien&language=en-US&page=-1&include_adult=false'],
    ['decimal page', 'query=Alien&language=en-US&page=1.5&include_adult=false'],
    ['scientific page', 'query=Alien&language=en-US&page=1e2&include_adult=false'],
    ['leading-zero page', 'query=Alien&language=en-US&page=01&include_adult=false'],
    ['wrong language', 'query=Alien&language=fr-FR&page=1&include_adult=false'],
    ['mixed-case parameter', 'query=Alien&Language=en-US&page=1&include_adult=false'],
    ['adult numeric bypass', 'query=Alien&language=en-US&page=1&include_adult=1'],
    ['adult mixed-case bypass', 'query=Alien&language=en-US&page=1&include_adult=False'],
    ['unexpected api key', 'query=Alien&language=en-US&page=1&include_adult=false&api_key=x'],
    ['prototype parameter', 'query=Alien&language=en-US&page=1&include_adult=false&__proto__=x'],
    ['constructor parameter', 'query=Alien&language=en-US&page=1&include_adult=false&constructor=x'],
    ['prototype-name parameter', 'query=Alien&language=en-US&page=1&include_adult=false&prototype=x'],
    ['encoded long query', `query=${encodeURIComponent('é'.repeat(101))}&language=en-US&page=1&include_adult=false`],
  ]) it(`rejects ${name}`, () => assert.equal(validateTmdbProxyRequest(`/api/tmdb/search/movie?${suffix}`), null))
})

describe('TMDB proxy security and upstream handling', () => {
  it('rejects a missing App Check header before upstream access', async () => {
    const { handler, calls } = setup()
    const res = await run(handler, request({ headers: {} }))
    assert.equal(res.statusCode, 401)
    assert.equal(calls.length, 0)
  })

  for (const header of ['', '   ', ['one', 'two'], 'x'.repeat(4097)]) {
    it('rejects malformed or duplicated App Check headers before verification', async () => {
      let verificationCalls = 0
      const { handler, calls } = setup({ verifyAppCheck: async () => { verificationCalls += 1 } })
      const res = await run(handler, request({ headers: { 'x-firebase-appcheck': header } }))
      assert.equal(res.statusCode, 401)
      assert.equal(verificationCalls, 0)
      assert.equal(calls.length, 0)
    })
  }

  it('rejects failed App Check verification before upstream access', async () => {
    const { handler, calls } = setup({ verifyAppCheck: async () => { throw new Error('RAW_TOKEN') } })
    const res = await run(handler)
    assert.equal(res.statusCode, 403)
    assert.equal(calls.length, 0)
    assert.ok(!JSON.stringify(res.body).includes('RAW_TOKEN'))
  })

  it('rejects an unconfirmed App Check result', async () => {
    const { handler, calls } = setup({ verifyAppCheck: async () => ({}) })
    const res = await run(handler)
    assert.equal(res.statusCode, 403)
    assert.equal(calls.length, 0)
  })

  it('accepts verified App Check and forwards only fixed headers and host', async () => {
    const { handler, calls } = setup()
    const res = await run(handler)
    assert.equal(res.statusCode, 200)
    assert.equal(calls[0][0].origin, 'https://api.themoviedb.org')
    assert.equal(calls[0][0].pathname, '/3/search/movie')
    assert.deepEqual(calls[0][1].headers, {
      Accept: 'application/json', Authorization: 'Bearer synthetic-tmdb-token',
    })
    assert.ok(!calls[0][0].toString().includes('synthetic-app-check-token'))
    assert.equal(calls[0][1].redirect, 'error')
  })

  it('enforces verification, contract, secret and one upstream request in that order', async () => {
    const events = []
    const { handler, calls } = setup({
      verifyAppCheck: async () => { events.push('verify'); return { app_id: 'synthetic-app' } },
      getSecret: () => { events.push('secret'); return 'synthetic-tmdb-token' },
      fetchImpl: async (...args) => { events.push('fetch'); calls.push(args); return upstream() },
    })
    const res = await run(handler)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(events, ['verify', 'secret', 'fetch'])
    assert.equal(calls.length, 1)
  })

  it('rejects an unsupported method before verification or upstream access', async () => {
    let verificationCalls = 0
    const { handler, calls } = setup({ verifyAppCheck: async () => { verificationCalls += 1 } })
    const res = await run(handler, request({ method: 'POST' }))
    assert.equal(res.statusCode, 405)
    assert.equal(verificationCalls, 0)
    assert.equal(calls.length, 0)
  })

  for (const method of ['HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE']) {
    it(`rejects ${method} without verification, secret or upstream access`, async () => {
      const events = []
      const { handler, calls } = setup({
        verifyAppCheck: async () => { events.push('verify') },
        getSecret: () => { events.push('secret'); return 'synthetic-tmdb-token' },
      })
      const res = await run(handler, request({ method }))
      assert.equal(res.statusCode, 405)
      assert.deepEqual(events, [])
      assert.equal(calls.length, 0)
    })
  }

  it('rejects an invalid route after App Check and before upstream access', async () => {
    let secretCalls = 0
    const { handler, calls } = setup({ getSecret: () => { secretCalls += 1; return 'synthetic-tmdb-token' } })
    const res = await run(handler, request({ originalUrl: '/api/tmdb/account' }))
    assert.equal(res.statusCode, 400)
    assert.equal(secretCalls, 0)
    assert.equal(calls.length, 0)
  })

  it('fails closed when the secret is unavailable', async () => {
    const { handler, calls } = setup({ getSecret: () => '' })
    const res = await run(handler)
    assert.equal(res.statusCode, 503)
    assert.equal(calls.length, 0)
  })

  it('sanitizes secret provider failures', async () => {
    const { handler, calls } = setup({ getSecret: () => { throw new Error('RAW_SECRET_FAILURE') } })
    const res = await run(handler)
    assert.equal(res.statusCode, 503)
    assert.deepEqual(res.body, { error: 'catalog-unavailable' })
    assert.equal(calls.length, 0)
  })

  for (const [status, expected] of [[401, 502], [404, 404], [429, 429], [500, 502], [503, 502]]) {
    it(`maps TMDB ${status} to stable ${expected}`, async () => {
      const { handler } = setup({ fetchImpl: async () => upstream(status, { status_message: 'RAW_UPSTREAM' }) })
      const res = await run(handler)
      assert.equal(res.statusCode, expected)
      assert.ok(!JSON.stringify(res.body).includes('RAW_UPSTREAM'))
    })
  }

  it('maps upstream timeout without exposing errors', async () => {
    const { handler } = setup({
      timeoutMs: 1,
      fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('RAW_TIMEOUT', 'AbortError')))
      }),
    })
    const res = await run(handler)
    assert.equal(res.statusCode, 504)
    assert.deepEqual(res.body, { error: 'catalog-timeout' })
  })

  it('rejects non-JSON and malformed JSON contracts', async () => {
    const nonJson = setup({ fetchImpl: async () => upstream(200, {}, 'text/html') })
    assert.equal((await run(nonJson.handler)).statusCode, 502)
    const malformed = setup({ fetchImpl: async () => upstream(200, { page: 1 }) })
    assert.equal((await run(malformed.handler)).statusCode, 502)
  })

  it('returns an expected JSON response without upstream headers', async () => {
    const payload = { page: 1, results: [{ id: 1 }] }
    const { handler } = setup({ fetchImpl: async () => upstream(200, payload) })
    const res = await run(handler)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, payload)
    assert.equal(res.headers['cache-control'], 'private, no-store, max-age=0')
    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
    assert.equal(res.headers['access-control-allow-origin'], undefined)
    assert.equal(res.headers['set-cookie'], undefined)
  })

  it('does not forward client credentials, cookies or hop-by-hop headers', async () => {
    const { handler, calls } = setup()
    await run(handler, request({ headers: {
      'x-firebase-appcheck': 'synthetic-app-check-token',
      authorization: 'Bearer client-value', cookie: 'session=client', connection: 'keep-alive',
    } }))
    assert.deepEqual(Object.keys(calls[0][1].headers).sort(), ['Accept', 'Authorization'])
    assert.equal(calls[0][1].headers.Authorization, 'Bearer synthetic-tmdb-token')
  })

  it('rejects oversized upstream responses', async () => {
    const payload = { results: [], padding: 'x'.repeat(512) }
    const { handler } = setup({ fetchImpl: async () => upstream(200, payload), maxResponseBytes: 128 })
    const res = await run(handler)
    assert.equal(res.statusCode, 502)
    assert.deepEqual(res.body, { error: 'invalid-catalog-response' })
  })

  it('never returns credentials in safe errors', async () => {
    const { handler } = setup({ fetchImpl: async () => { throw new Error('synthetic-tmdb-token synthetic-app-check-token') } })
    const res = await run(handler)
    assert.equal(res.statusCode, 502)
    assert.ok(!JSON.stringify(res.body).includes('synthetic'))
  })
})
