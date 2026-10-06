import assert from 'node:assert/strict'
import {
  afterEach,
  describe,
  it,
  mock,
} from 'node:test'

import {
  browseTvShows,
} from '../../src/features/catalog/services/browseService.js'


afterEach(() => {
  mock.restoreAll()
})


function show(
  id,
  name,
  voteAverage,
  voteCount,
) {
  return {
    id,
    name,
    overview: '',
    poster_path: null,
    backdrop_path: null,
    first_air_date: '2010-01-01',
    vote_average: voteAverage,
    vote_count: voteCount,
    genre_ids: [18],
    popularity: 10,
  }
}


describe(
  'Top Rated established-title source',
  () => {
    it(
      'can promote a massively voted classic absent from the raw Top Rated head',
      async () => {
        mock.method(
          globalThis,
          'fetch',
          async url => {
            const parsed = new URL(
              url,
              'http://localhost',
            )

            const page = Number(
              parsed.searchParams.get(
                'page',
              ),
            )

            const mostVoted = (
              parsed.pathname
                === '/api/tmdb/discover/tv'
              && parsed.searchParams.get(
                'sort_by',
              ) === 'vote_count.desc'
            )

            let results

            if (
              mostVoted
              && page === 1
            ) {
              results = [
                show(
                  9999,
                  'Established Classic',
                  8.6,
                  250000,
                ),
                ...Array.from(
                  { length: 19 },
                  (_, index) => show(
                    8000 + index,
                    `Established ${index}`,
                    8.1,
                    30000 - index,
                  ),
                ),
              ]
            } else {
              results = Array.from(
                { length: 20 },
                (_, index) => show(
                  page * 100 + index,
                  `Niche ${page}-${index}`,
                  9.0,
                  700,
                ),
              )
            }

            return new Response(
              JSON.stringify({
                page,
                total_pages: 20,
                total_results: 400,
                results,
              }),
            )
          },
        )

        const result =
          await browseTvShows({
            view: 'top-rated',
            page: 1,
          })

        assert.equal(
          result.results[0].id,
          9999,
        )
      },
    )
  },
)
