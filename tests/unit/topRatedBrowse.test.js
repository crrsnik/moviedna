import assert from 'node:assert/strict'
import {
  afterEach,
  describe,
  it,
  mock,
} from 'node:test'

import {
  browseMovies,
  browseTvShows,
} from '../../src/features/catalog/services/browseService.js'

import {
  isAllowedBrowseRequest,
} from '../../src/features/catalog/validation/browseValidation.js'


afterEach(() => {
  mock.restoreAll()
})


function respond() {
  return new Response(
    JSON.stringify({
      page: 1,
      total_pages: 1,
      total_results: 0,
      results: [],
    }),
  )
}


describe('Top Rated browse confidence threshold', () => {
  it('requires 500 votes for filtered movies', async () => {
    const fetchMock = mock.method(
      globalThis,
      'fetch',
      async () => respond(),
    )

    await browseMovies({
      view: 'top-rated',
      genre: 28,
      page: 1,
    })

    const url = new URL(
      fetchMock.mock.calls[0].arguments[0],
      'http://localhost',
    )

    assert.equal(
      url.searchParams.get('sort_by'),
      'vote_average.desc',
    )

    assert.equal(
      url.searchParams.get(
        'vote_count.gte',
      ),
      '500',
    )
  })


  it('requires 200 votes for filtered TV', async () => {
    const fetchMock = mock.method(
      globalThis,
      'fetch',
      async () => respond(),
    )

    await browseTvShows({
      view: 'top-rated',
      genre: 18,
      page: 1,
    })

    const url = new URL(
      fetchMock.mock.calls[0].arguments[0],
      'http://localhost',
    )

    assert.equal(
      url.searchParams.get(
        'vote_count.gte',
      ),
      '200',
    )
  })


  it('allows only the canonical Top Rated vote thresholds', () => {
    const movie =
      '/api/tmdb/discover/movie'
      + '?language=en-US'
      + '&page=1'
      + '&sort_by=vote_average.desc'
      + '&include_adult=false'
      + '&include_video=false'
      + '&with_genres=28'
      + '&vote_count.gte=500'

    const tv =
      '/api/tmdb/discover/tv'
      + '?language=en-US'
      + '&page=1'
      + '&sort_by=vote_average.desc'
      + '&include_adult=false'
      + '&include_null_first_air_dates=false'
      + '&with_genres=18'
      + '&vote_count.gte=200'

    assert.equal(
      isAllowedBrowseRequest(
        new URL(
          movie,
          'http://localhost',
        ),
      ),
      true,
    )

    assert.equal(
      isAllowedBrowseRequest(
        new URL(
          tv,
          'http://localhost',
        ),
      ),
      true,
    )

    assert.equal(
      isAllowedBrowseRequest(
        new URL(
          movie.replace(
            'vote_count.gte=500',
            'vote_count.gte=5',
          ),
          'http://localhost',
        ),
      ),
      false,
    )

    assert.equal(
      isAllowedBrowseRequest(
        new URL(
          movie.replace(
            '&vote_count.gte=500',
            '',
          ),
          'http://localhost',
        ),
      ),
      false,
    )
  })
})
