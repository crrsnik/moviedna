import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createTmdbTransport } from '../../src/features/catalog/services/tmdbTransport.js'

describe('TMDB frontend transport', () => {
  it('adds a current App Check token only to the production header', async () => {
    let request
    const transport = createTmdbTransport({
      production: true,
      tokenProvider: async () => 'synthetic-app-check-token',
      fetchImpl: async (...args) => { request = args; return new Response('{}') },
    })
    await transport.request('/api/tmdb/movie/1?language=en-US', { headers: { Accept: 'application/json' } })
    assert.equal(request[0], '/api/tmdb/movie/1?language=en-US')
    assert.deepEqual(request[1].headers, {
      Accept: 'application/json',
      'X-Firebase-AppCheck': 'synthetic-app-check-token',
    })
    assert.ok(!request[0].includes('synthetic-app-check-token'))
  })

  it('does not activate the App Check transport in development', async () => {
    let tokenCalls = 0
    let options
    const transport = createTmdbTransport({
      production: false,
      tokenProvider: async () => { tokenCalls += 1; return 'unused' },
      fetchImpl: async (_url, received) => { options = received; return new Response('{}') },
    })
    await transport.request('/api/tmdb/trending/movie/day', { headers: { Accept: 'application/json' } })
    assert.equal(tokenCalls, 0)
    assert.deepEqual(options.headers, { Accept: 'application/json' })
  })

  it('returns a safe catalog error when token acquisition fails', async () => {
    const transport = createTmdbTransport({
      production: true,
      tokenProvider: async () => { throw new Error('RAW_TOKEN_FAILURE') },
      fetchImpl: async () => { throw new Error('must not fetch') },
    })
    await assert.rejects(transport.request('/api/tmdb/movie/1'), (error) => {
      assert.equal(error.code, 'access')
      assert.ok(!error.message.includes('RAW_TOKEN_FAILURE'))
      return true
    })
  })

  it('rejects an empty production token before fetch', async () => {
    let fetchCalls = 0
    const transport = createTmdbTransport({
      production: true,
      tokenProvider: async () => '',
      fetchImpl: async () => { fetchCalls += 1 },
    })
    await assert.rejects(transport.request('/api/tmdb/movie/1'), { code: 'access' })
    assert.equal(fetchCalls, 0)
  })
})
