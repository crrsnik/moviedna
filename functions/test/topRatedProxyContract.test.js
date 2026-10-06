import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  validateTmdbProxyRequest,
} from '../src/proxy/tmdbProxyContract.js'


describe('Top Rated TMDb proxy contract', () => {
  it('accepts canonical confidence thresholds', () => {
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

    assert.ok(
      validateTmdbProxyRequest(movie),
    )

    assert.ok(
      validateTmdbProxyRequest(tv),
    )
  })


  it('rejects missing or arbitrary vote thresholds', () => {
    const base =
      '/api/tmdb/discover/movie'
      + '?language=en-US'
      + '&page=1'
      + '&sort_by=vote_average.desc'
      + '&include_adult=false'
      + '&include_video=false'
      + '&with_genres=28'

    assert.equal(
      validateTmdbProxyRequest(base),
      null,
    )

    assert.equal(
      validateTmdbProxyRequest(
        `${base}&vote_count.gte=1`,
      ),
      null,
    )
  })
})
