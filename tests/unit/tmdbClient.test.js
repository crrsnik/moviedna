import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { getTmdb } from '../../src/features/catalog/services/tmdbClient.js'
import { getTmdbErrorMessage, isTmdbAbort } from '../../src/features/catalog/services/tmdbErrors.js'

const path = '/trending/movie/day'
let fetchMock
beforeEach(() => { fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ results: [] }))) })
afterEach(() => mock.restoreAll())

describe('TMDB client with mocked fetch', () => {
  it('uses relative URL, encoded query, GET, Accept, signal and no Authorization', async () => {
    const signal = new AbortController().signal
    assert.deepEqual(await getTmdb(path, { language: 'fr-FR', signal }), { results: [] })
    const [url, options] = fetchMock.mock.calls[0].arguments
    assert.equal(url, '/api/tmdb/trending/movie/day?language=fr-FR')
    assert.equal(options.method, 'GET')
    assert.deepEqual(options.headers, { Accept: 'application/json' })
    assert.equal(options.signal, signal)
    assert.equal(options.credentials, 'omit')
    assert.equal(options.redirect, 'error')
  })
  it('defaults language to en-US', async () => {
    await getTmdb('/trending/tv/day')
    assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/tmdb/trending/tv/day?language=en-US')
  })
  for (const [status, code] of [[400, 'request'], [401, 'access'], [403, 'access'], [404, 'missing'], [429, 'limit'], [500, 'server'], [503, 'server'], [418, 'unknown']]) {
    it(`maps HTTP ${status} without exposing upstream body or status text`, async () => {
      fetchMock.mock.mockImplementation(async () => new Response('RAW_UPSTREAM_MESSAGE', { status, statusText: 'RAW_STATUS' }))
      await assert.rejects(getTmdb(path), (error) => {
        assert.equal(error.code, code)
        assert.ok(!getTmdbErrorMessage(error).includes('RAW_'))
        assert.ok(!error.stack.includes('RAW_'))
        return true
      })
    })
  }
  it('maps network failure without raw exception', async () => {
    fetchMock.mock.mockImplementation(async () => { throw new TypeError('RAW_NETWORK_DETAILS') })
    await assert.rejects(getTmdb(path), { code: 'network' })
  })
  it('maps invalid JSON', async () => {
    fetchMock.mock.mockImplementation(async () => new Response('<html>RAW_HTML</html>'))
    await assert.rejects(getTmdb(path), { code: 'invalid' })
  })
  it('aborts before fetch without exposing custom abort reason', async () => {
    const controller = new AbortController()
    controller.abort('PRIVATE_ABORT_REASON')
    await assert.rejects(getTmdb(path, { signal: controller.signal }), (error) => isTmdbAbort(error) && !error.message.includes('PRIVATE'))
    assert.equal(fetchMock.mock.callCount(), 0)
  })
  it('preserves AbortError from fetch', async () => {
    fetchMock.mock.mockImplementation(async () => { throw new DOMException('RAW_ABORT', 'AbortError') })
    await assert.rejects(getTmdb(path), (error) => isTmdbAbort(error) && !error.message.includes('RAW'))
  })
  it('preserves cancellation while reading the body', async () => {
    fetchMock.mock.mockImplementation(async () => ({ ok: true, json: async () => { throw new DOMException('Cancelled', 'AbortError') } }))
    await assert.rejects(getTmdb(path), { name: 'AbortError' })
  })
  it('does not return data after signal aborts during JSON parsing', async () => {
    const controller = new AbortController()
    fetchMock.mock.mockImplementation(async () => ({ ok: true, json: async () => { controller.abort(); return { results: [] } } }))
    await assert.rejects(getTmdb(path, { signal: controller.signal }), { name: 'AbortError' })
  })
  for (const endpoint of ['https://example.invalid', '//example.invalid', '/trending/movie/day?target=elsewhere', '/../../account', '/movie/1']) {
    it(`rejects an unsupported endpoint: ${endpoint}`, async () => {
      await assert.rejects(getTmdb(endpoint), { code: 'request' })
      assert.equal(fetchMock.mock.callCount(), 0)
    })
  }
  it('rejects query injection and unexpected language types', async () => {
    for (const language of ['en-US&api_key=anything', {}, null]) await assert.rejects(getTmdb(path, { language }), { code: 'request' })
    assert.equal(fetchMock.mock.callCount(), 0)
  })
  it('never displays raw unknown messages', () => {
    assert.equal(getTmdbErrorMessage(new Error('RAW_PRIVATE')), "We couldn't load the catalog. Please try again.")
  })
})
