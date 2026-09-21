import { afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { getTrendingMovies, getTrendingTvShows } from '../../src/features/catalog/services/catalogService.js'

const movie = {
  id: 123, media_type: 'movie', title: 'Synthetic movie', overview: 'Synthetic overview',
  poster_path: '/demo.jpg', backdrop_path: '/backdrop.png', release_date: '2024-02-29',
  vote_average: 7.5, vote_count: 12, genre_ids: [18, 35], popularity: 10,
}
const respond = (body) => mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body)))
afterEach(() => mock.restoreAll())

describe('Catalog normalization with synthetic data', () => {
  it('normalizes movie fields and removes unknown upstream fields', async () => {
    respond({ results: [{ ...movie, secret: 'not public', adult: false }] })
    assert.deepEqual(await getTrendingMovies(), [{
      id: 123, mediaType: 'movie', title: 'Synthetic movie', overview: 'Synthetic overview',
      posterPath: '/demo.jpg', backdropPath: '/backdrop.png', releaseDate: '2024-02-29',
      voteAverage: 7.5, voteCount: 12, genreIds: [18, 35], popularity: 10,
    }])
  })
  it('maps TV name and first_air_date without using movie fields', async () => {
    const fetchMock = respond({ results: [{ ...movie, media_type: 'tv', name: 'Synthetic series', first_air_date: '2023-01-01' }] })
    const signal = new AbortController().signal
    const [result] = await getTrendingTvShows({ language: 'en-US', signal })
    assert.equal(result.title, 'Synthetic series')
    assert.equal(result.releaseDate, '2023-01-01')
    assert.equal(result.mediaType, 'tv')
    assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/tmdb/trending/tv/day?language=en-US')
    assert.equal(fetchMock.mock.calls[0].arguments[1].signal, signal)
    assert.ok(!('name' in result) && !('first_air_date' in result))
  })
  it('filters malformed, duplicate and mismatched media', async () => {
    respond({ results: [null, {}, { ...movie, id: -1 }, { ...movie, id: '123' }, { ...movie, title: ' ' }, { ...movie, media_type: 'tv' }, movie, movie] })
    assert.equal((await getTrendingMovies()).length, 1)
  })
  it('does not mix movies into TV', async () => {
    respond({ results: [movie, { id: 1, name: 'Synthetic series', media_type: 'tv' }] })
    assert.equal((await getTrendingTvShows()).length, 1)
  })
  it('allows missing posters and safely defaults optional fields', async () => {
    respond({ results: [{ id: 1, title: 'Synthetic minimal' }] })
    assert.deepEqual((await getTrendingMovies())[0], {
      id: 1, mediaType: 'movie', title: 'Synthetic minimal', overview: '', posterPath: null,
      backdropPath: null, releaseDate: null, voteAverage: null, voteCount: 0, genreIds: [], popularity: 0,
    })
  })
  it('rejects external images, invalid dates and malformed numeric fields', async () => {
    respond({ results: [{ ...movie, poster_path: 'https://example.invalid/a.jpg', release_date: '2023-02-29', vote_average: 11, vote_count: -1, genre_ids: [18, 18, null, '35', -1], popularity: 'high' }] })
    const [result] = await getTrendingMovies()
    assert.equal(result.posterPath, null)
    assert.equal(result.releaseDate, null)
    assert.equal(result.voteAverage, null)
    assert.equal(result.voteCount, 0)
    assert.deepEqual(result.genreIds, [18])
    assert.equal(result.popularity, 0)
  })
  for (const body of [null, {}, { results: 'RAW_UPSTREAM' }]) {
    it(`rejects malformed response ${JSON.stringify(body)}`, async () => {
      respond(body)
      await assert.rejects(getTrendingMovies(), { code: 'invalid' })
    })
  }
  it('supports empty results', async () => {
    respond({ results: [] })
    assert.deepEqual(await getTrendingMovies(), [])
  })
})
