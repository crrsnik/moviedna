import { beforeEach, afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { searchCatalog } from '../../src/features/catalog/services/searchService.js'
import { getTmdbErrorMessage } from '../../src/features/catalog/services/tmdbErrors.js'
let fetchMock, payload
beforeEach(() => {
  payload = { page: 1, total_pages: 2, total_results: 21, results: [] }
  fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(payload)))
})
afterEach(() => mock.restoreAll())
const movie = { id: 1, media_type: 'movie', title: ' Synthetic ', overview: 'Plot', poster_path: '/poster.jpg', backdrop_path: '/back.jpg', release_date: '2020-01-01', vote_average: 7, vote_count: 2, genre_ids: [18, 18, -1], popularity: 3, privateExtra: 'discard' }
const tv = { id: 2, media_type: 'tv', name: 'Series', first_air_date: '2021-02-03' }

describe('Search service with mocked fetch', () => {
  for (const [type, endpoint] of [['all', 'multi'], ['movie', 'movie'], ['tv', 'tv'], ['person', 'person']]) it(`routes ${type}, encodes query and excludes adult content without authorization`, async () => {
    const signal = new AbortController().signal
    await searchCatalog({ query: '  A & B  ', type, page: 2, signal })
    const [url, options] = fetchMock.mock.calls[0].arguments
    assert.equal(url, `/api/tmdb/search/${endpoint}?language=en-US&query=A+%26+B&page=2&include_adult=false`)
    assert.deepEqual(options.headers, { Accept: 'application/json' })
    assert.equal(options.signal, signal)
    assert.equal(options.credentials, 'omit')
  })
  for (const query of ['', 'a', ' '.repeat(4), 'a'.repeat(101)]) it(`rejects invalid query length ${query.length} without requests`, async () => {
    await assert.rejects(searchCatalog({ query }), { code: 'request' })
    assert.equal(fetchMock.mock.callCount(), 0)
  })
  it('rejects other languages', async () => { await assert.rejects(searchCatalog({ query: 'Alien', language: 'fr-FR' }), { code: 'request' }); assert.equal(fetchMock.mock.callCount(), 0) })
  it('normalizes invalid type/page before requesting', async () => {
    await searchCatalog({ query: 'Alien', type: 'unknown', page: -2 })
    assert.match(fetchMock.mock.calls[0].arguments[0], /search\/multi.*page=1/)
  })
  it('normalizes movie and TV fields without mutating or carrying extra data', async () => {
    payload.results = [movie, tv]
    const original = JSON.stringify(payload)
    const { results } = await searchCatalog({ query: 'Synthetic' })
    assert.deepEqual(results[0], { id: 1, mediaType: 'movie', title: 'Synthetic', overview: 'Plot', posterPath: '/poster.jpg', backdropPath: '/back.jpg', releaseDate: '2020-01-01', voteAverage: 7, voteCount: 2, genreIds: [18], popularity: 3 })
    assert.deepEqual(results[1], { id: 2, mediaType: 'tv', title: 'Series', overview: '', posterPath: null, backdropPath: null, releaseDate: '2021-02-03', voteAverage: null, voteCount: 0, genreIds: [], popularity: 0 })
    assert.equal(JSON.stringify(payload), original)
  })
  it('normalizes people and at most three safe known-for references', async () => {
    payload.results = [{ id: 3, media_type: 'person', name: ' Actor ', profile_path: '/actor.jpg', known_for_department: 'Acting', popularity: 5, secret: 'discard', known_for: [null, { id: 4, media_type: 'unknown' }, movie, tv, { ...movie, id: 5 }, { ...tv, id: 6 }] }]
    const { results } = await searchCatalog({ query: 'Actor' })
    assert.deepEqual(results[0], { id: 3, mediaType: 'person', name: 'Actor', profilePath: '/actor.jpg', knownForDepartment: 'Acting', popularity: 5, knownFor: [
      { id: 1, mediaType: 'movie', title: 'Synthetic', releaseDate: '2020-01-01' }, { id: 2, mediaType: 'tv', title: 'Series', releaseDate: '2021-02-03' }, { id: 5, mediaType: 'movie', title: 'Synthetic', releaseDate: '2020-01-01' },
    ] })
  })
  for (const type of ['movie', 'tv', 'person']) it(`infers missing media_type for ${type}`, async () => {
    payload.results = [{ id: 1, title: 'Title', name: 'Name' }]
    assert.equal((await searchCatalog({ query: 'Title', type })).results[0].mediaType, type)
  })
  it('filters malformed, unknown, duplicate and adult items', async () => {
    payload.results = [null, {}, { ...movie, id: -1 }, { ...movie, title: ' ' }, { ...movie, media_type: 'unknown' }, { id: 9, media_type: 'person', name: 1 }, { ...movie, adult: true }, movie, movie]
    assert.equal((await searchCatalog({ query: 'Title' })).results.length, 1)
  })
  it('does not conflate IDs across types', async () => { payload.results = [movie, { ...tv, id: 1 }]; assert.equal((await searchCatalog({ query: 'Title' })).results.length, 2) })
  it('drops a conflicting media type from a dedicated endpoint', async () => { payload.results = [tv]; assert.equal((await searchCatalog({ query: 'Title', type: 'movie' })).results.length, 0) })
  for (const [values, expected] of [
    [{ page: -1, total_pages: -1, total_results: -1 }, [1, 0, 0]],
    [{ page: 100, total_pages: 2, total_results: 21 }, [2, 2, 21]],
    [{ page: 2, total_pages: 1000, total_results: 10000 }, [2, 500, 10000]],
    [{ page: '2', total_pages: '9', total_results: NaN }, [1, 0, 0]],
  ]) it(`normalizes pagination ${JSON.stringify(values)}`, async () => {
    Object.assign(payload, values)
    const result = await searchCatalog({ query: 'Title' })
    assert.deepEqual([result.page, result.totalPages, result.totalResults], expected)
  })
  for (const status of [400, 401, 403, 404, 429, 500, 503]) it(`handles ${status} without raw errors`, async () => {
    fetchMock.mock.mockImplementation(async () => new Response('RAW_PRIVATE_MESSAGE', { status }))
    await assert.rejects(searchCatalog({ query: 'Title' }), (error) => !getTmdbErrorMessage(error).includes('RAW_') && !error.stack.includes('RAW_'))
  })
  it('handles network failure safely', async () => { fetchMock.mock.mockImplementation(async () => { throw Error('RAW_PRIVATE') }); await assert.rejects(searchCatalog({ query: 'Title' }), { code: 'network' }) })
  it('handles invalid JSON safely', async () => { fetchMock.mock.mockImplementation(async () => new Response('RAW_INVALID')); await assert.rejects(searchCatalog({ query: 'Title' }), { code: 'invalid' }) })
  it('rejects malformed result envelope', async () => { payload.results = null; await assert.rejects(searchCatalog({ query: 'Title' }), { code: 'invalid' }) })
  it('aborts before dispatch', async () => { const c = new AbortController(); c.abort(); await assert.rejects(searchCatalog({ query: 'Title', signal: c.signal }), { name: 'AbortError' }); assert.equal(fetchMock.mock.callCount(), 0) })
  it('ignores a result aborted during JSON decoding', async () => {
    const c = new AbortController()
    fetchMock.mock.mockImplementation(async () => ({ ok: true, json: async () => { c.abort(); return payload } }))
    await assert.rejects(searchCatalog({ query: 'Title', signal: c.signal }), { name: 'AbortError' })
  })
})
