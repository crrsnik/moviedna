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
    first_air_date: '2020-01-01',
    vote_average: voteAverage,
    vote_count: voteCount,
    genre_ids: [18],
    popularity: 10,
  }
}


describe(
  'global Top Rated candidate pool',
  () => {
    it(
      'can promote a strong title from a deep TMDb page onto MovieDNA page one',
      async () => {
        const fetchMock = mock.method(
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

            const ordinary = Array.from(
              { length: 20 },
              (_, index) => (
                show(
                  page * 100 + index,
                  `Show ${page}-${index}`,
                  8.8,
                  300,
                )
              ),
            )

            if (page === 9) {
              ordinary[19] = show(
                9999,
                'Established Classic',
                8.7,
                250000,
              )
            }

            return new Response(
              JSON.stringify({
                page,
                total_pages: 10,
                total_results: 200,
                results: ordinary,
              }),
            )
          },
        )

        const result =
          await browseTvShows({
            view: 'top-rated',
            page: 1,
          })

        assert.ok(
          fetchMock.mock.callCount()
            >= 10,
        )

        assert.equal(
          fetchMock.mock.calls.some(
            call => new URL(
              call.arguments[0],
              'http://localhost',
            ).searchParams.get(
              'sort_by',
            ) === 'vote_count.desc',
          ),
          true,
        )

        assert.equal(
          result.results.some(
            item => item.id === 9999,
          ),
          true,
        )

        assert.equal(
          result.results[0].id,
          9999,
        )
      },
    )
  },
)
