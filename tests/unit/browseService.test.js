import { beforeEach, afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { browseMovies, browseTvShows, browsePeople, getMovieGenres, getTvGenres } from '../../src/features/catalog/services/browseService.js'
import { getTmdbErrorMessage } from '../../src/features/catalog/services/tmdbErrors.js'
let fetchMock, payload
beforeEach(() => {
  payload = { page: 2, total_pages: 3, total_results: 41, results: [] }
  fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(payload)))
})
afterEach(() => mock.restoreAll())
const mappings = [
  [browseMovies, 'now-playing', '/movie/now_playing'], [browseMovies, 'upcoming', '/movie/upcoming'],
  [browseTvShows, 'airing-today', '/tv/airing_today'], [browseTvShows, 'on-the-air', '/tv/on_the_air'],
  [browsePeople, 'popular', '/person/popular'], [browsePeople, 'trending', '/trending/person/week'],
]
describe('Browse services with synthetic fetch responses', () => {
  for (const [load, view, path] of mappings) it(`maps ${path}, only language/page and no client credentials`, async () => {
    const signal = new AbortController().signal
    await load({ view, page: 2, signal })
    const [url, options] = fetchMock.mock.calls[0].arguments
    assert.equal(url, `/api/tmdb${path}?language=en-US&page=2`)
    assert.equal(options.signal, signal)
    assert.deepEqual(options.headers, { Accept: 'application/json' })
    assert.equal(options.credentials, 'omit')
  })
  for (
    const [load, type, extra]
    of [
      [
        browseMovies,
        'movie',
        'include_video',
      ],
      [
        browseTvShows,
        'tv',
        'include_null_first_air_dates',
      ],
    ]
  ) {
    it(
      `discover ${type} sends multiple genres`,
      async () => {
        await load({
          genres: [28, 18],
          view: 'popular',
          page: 3,
        })

        const url = new URL(
          fetchMock.mock.calls[0]
            .arguments[0],
          'http://localhost',
        )

        assert.equal(
          url.pathname,
          `/api/tmdb/discover/${type}`,
        )

        assert.equal(
          url.searchParams.get(
            'with_genres',
          ),
          '28,18',
        )

        assert.equal(
          url.searchParams.get(
            'sort_by',
          ),
          'popularity.desc',
        )

        assert.equal(
          url.searchParams.get(extra),
          'false',
        )
      },
    )
  }

  it(
    'keeps upcoming view when genres are selected',
    async () => {
      await browseMovies({
        view: 'upcoming',
        genres: [16],
        page: 1,
      })

      const url = new URL(
        fetchMock.mock.calls[0]
          .arguments[0],
        'http://localhost',
      )

      assert.equal(
        url.pathname,
        '/api/tmdb/discover/movie',
      )

      assert.equal(
        url.searchParams.get(
          'with_genres',
        ),
        '16',
      )

      assert.equal(
        url.searchParams.get(
          'sort_by',
        ),
        'primary_release_date.asc',
      )

      assert.match(
        url.searchParams.get(
          'primary_release_date.gte',
        ),
        /^\d{4}-\d{2}-\d{2}$/,
      )
    },
  )

  it(
    'keeps top-rated view with genres',
    async () => {
      await browseTvShows({
        view: 'top-rated',
        genres: [18, 80],
      })

      const url = new URL(
        fetchMock.mock.calls[0]
          .arguments[0],
        'http://localhost',
      )

      assert.equal(
        url.searchParams.get(
          'with_genres',
        ),
        '18,80',
      )

      assert.equal(
        url.searchParams.get(
          'sort_by',
        ),
        'vote_average.desc',
      )
    },
  )

  it('normalizes movie with only allowed fields without mutating data', async () => {
    payload.results = [{ id: 1, title: ' Movie ', genre_ids: [28, 28, -1], release_date: '2020-01-01', extra: 'drop' }]
    const original = JSON.stringify(payload)
    assert.deepEqual((await browseMovies({ view: 'now-playing' })).results[0], { id: 1, mediaType: 'movie', title: 'Movie', overview: '', posterPath: null, backdropPath: null, releaseDate: '2020-01-01', voteAverage: null, voteCount: 0, genreIds: [28], popularity: 0 })
    assert.equal(JSON.stringify(payload), original)
  })
  it('normalizes TV and person using the existing shared shapes', async () => {
    payload.results = [{ id: 2, name: 'Series', first_air_date: '2021-01-02' }]
    const tv = (await browseTvShows({ view: 'airing-today' })).results[0]
    assert.equal(tv.title, 'Series'); assert.equal(tv.releaseDate, '2021-01-02'); assert.equal(tv.mediaType, 'tv')
    payload.results = [{ id: 3, name: 'Person', known_for: [{ id: 2, name: 'Series', media_type: 'tv' }] }]
    assert.deepEqual((await browsePeople()).results[0], { id: 3, mediaType: 'person', name: 'Person', profilePath: null, knownForDepartment: '', popularity: 0, knownFor: [{ id: 2, mediaType: 'tv', title: 'Series', releaseDate: null }] })
  })
  it('drops malformed, adult and mismatched media results', async () => {
    payload.results = [null, {}, { id: 1, title: 'Adult', adult: true }, { id: 2, media_type: 'person', name: 'Wrong' }]
    assert.deepEqual((await browseMovies({ view: 'now-playing' })).results, [])
  })
  it('shares bounded pagination normalization', async () => {
    Object.assign(payload, { page: 999, total_pages: 1000, total_results: -1 })
    const data = await browseMovies({ view: 'now-playing' })
    assert.deepEqual(data, { page: 1, totalPages: 500, totalResults: 0, results: [] })
    Object.assign(payload, { page: 9, total_pages: 2 })
    assert.equal((await browseMovies({ view: 'now-playing' })).page, 2)
  })
  it('defaults invalid view/page and ignores person genre', async () => {
    await browsePeople({ view: 'bad', page: -1, genres: [28] })
    assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/tmdb/person/popular?language=en-US&page=1')
  })
  for (const status of [400, 401, 403, 404, 429, 500, 503]) it(`sanitizes HTTP ${status}`, async () => {
    fetchMock.mock.mockImplementation(async () => new Response('RAW_SECRET', { status }))
    await assert.rejects(browseMovies({ view: 'now-playing' }), (error) => !getTmdbErrorMessage(error).includes('RAW') && !error.stack.includes('RAW'))
  })
  it('sanitizes network error', async () => { fetchMock.mock.mockImplementation(async () => { throw Error('RAW_SECRET') }); await assert.rejects(browseMovies({ view: 'now-playing' }), { code: 'network' }) })
  it('rejects invalid JSON', async () => { fetchMock.mock.mockImplementation(async () => new Response('invalid')); await assert.rejects(browseTvShows({ view: 'airing-today' }), { code: 'invalid' }) })
  it('rejects malformed envelopes', async () => { payload = {}; await assert.rejects(browsePeople(), { code: 'invalid' }) })
  it('rejects unsupported language before dispatch', async () => { await assert.rejects(browseMovies({ view: 'now-playing', language: 'de-DE' }), { code: 'request' }); assert.equal(fetchMock.mock.callCount(), 0) })
  it('aborts before fetch', async () => { const c = new AbortController(); c.abort(); await assert.rejects(browseMovies({ view: 'now-playing', signal: c.signal }), { name: 'AbortError' }); assert.equal(fetchMock.mock.callCount(), 0) })
  it('discards a response cancelled during parsing', async () => {
    const c = new AbortController()
    fetchMock.mock.mockImplementation(async () => ({ ok: true, json: async () => { c.abort(); return payload } }))
    await assert.rejects(browseTvShows({ view: 'airing-today', signal: c.signal }), { name: 'AbortError' })
  })
})
describe('Genres', () => {
  for (const [load, type] of [[getMovieGenres, 'movie'], [getTvGenres, 'tv']]) it(`normalizes ${type} genres, keeping order and immutability`, async () => {
    payload = { genres: [null, { id: 28, name: ' Action ', extra: 1 }, { id: 28, name: 'Duplicate' }, { id: 18, name: 'Drama' }, { id: 0, name: 'Invalid' }, { id: '1', name: 'Invalid' }, { id: 2, name: ' ' }, { id: 3, name: null }, { id: 1.5, name: 'Invalid' }] }
    const original = JSON.stringify(payload), signal = new AbortController().signal
    assert.deepEqual(await load({ signal }), [{ id: 28, name: 'Action' }, { id: 18, name: 'Drama' }])
    assert.equal(JSON.stringify(payload), original)
    assert.equal(fetchMock.mock.calls[0].arguments[0], `/api/tmdb/genre/${type}/list?language=en-US`)
    assert.equal(fetchMock.mock.calls[0].arguments[1].signal, signal)
  })
  it('rejects missing genres', async () => { await assert.rejects(getMovieGenres(), { code: 'invalid' }) })
  it('propagates safe genre load errors', async () => { fetchMock.mock.mockImplementation(async () => new Response('RAW_ERROR', { status: 503 })); await assert.rejects(getTvGenres(), { code: 'server' }) })
})
