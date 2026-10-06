import assert from 'node:assert/strict'

import {
  afterEach,
  describe,
  it,
  mock,
} from 'node:test'

import {
  browseMovies,
} from '../../src/features/catalog/services/browseService.js'

afterEach(() => {
  mock.restoreAll()
})

function movie(
  id,
  {
    popularity,
    voteCount,
  },
) {
  return {
    id,
    title: `Movie ${id}`,
    overview: '',
    poster_path: `/poster-${id}.jpg`,
    backdrop_path: null,
    release_date: '2026-01-01',
    vote_average: 7,
    vote_count: voteCount,
    genre_ids: [18],
    popularity,
  }
}

describe('curated Popular browse', () => {
  it(
    'combines five Popular pages with weekly Trending and reranks mainstream interest',
    async () => {
      const obscureSpike = movie(1, {
        popularity: 1000,
        voteCount: 10,
      })

      const established = movie(2, {
        popularity: 200,
        voteCount: 50000,
      })

      const fetchMock = mock.method(
        globalThis,
        'fetch',
        async url => {
          const parsed = new URL(
            url,
            'http://localhost',
          )

          if (
            parsed.pathname
              === '/api/tmdb/trending/movie/week'
          ) {
            return new Response(
              JSON.stringify({
                page: 1,
                total_pages: 1,
                total_results: 1,
                results: [
                  obscureSpike,
                ],
              }),
            )
          }

          const page = Number(
            parsed.searchParams.get('page'),
          )

          return new Response(
            JSON.stringify({
              page,
              total_pages: 5,
              total_results: 100,
              results: [
                obscureSpike,
                established,
              ],
            }),
          )
        },
      )

      const result = await browseMovies({
        view: 'popular',
        page: 1,
      })

      assert.equal(
        result.results[0].id,
        2,
      )

      const urls =
        fetchMock.mock.calls.map(
          call => call.arguments[0],
        )

      assert.ok(
        urls.some(
          url => url.includes(
            '/trending/movie/week',
          ),
        ),
      )

      for (
        let page = 1;
        page <= 5;
        page += 1
      ) {
        assert.ok(
          urls.some(
            url => url.includes(
              `/movie/popular?language=en-US&page=${page}`,
            ),
          ),
        )
      }
    },
  )

  it(
    'keeps filtered Popular on discover instead of mixing unrelated Trending titles',
    async () => {
      const fetchMock = mock.method(
        globalThis,
        'fetch',
        async () => new Response(
          JSON.stringify({
            page: 1,
            total_pages: 1,
            total_results: 0,
            results: [],
          }),
        ),
      )

      await browseMovies({
        view: 'popular',
        genres: [28],
        page: 1,
      })

      assert.equal(
        fetchMock.mock.callCount(),
        1,
      )

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
          'sort_by',
        ),
        'popularity.desc',
      )
    },
  )
})
