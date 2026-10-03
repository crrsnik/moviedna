import {
  afterEach,
  beforeEach,
  describe,
  it,
  mock,
} from 'node:test'
import assert from 'node:assert/strict'

import {
  getOnboardingMediaSummary,
  normalizeOnboardingMediaSummary,
} from '../../src/features/onboarding/services/onboardingCatalogService.js'

const movie = {
  id: 550,
  title: ' Fight Club ',
  overview: 'Plot',
  release_date: '1999-10-15',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  vote_average: 8.4,
  vote_count: 100,
  popularity: 50,
  genres: [
    { id: 18, name: 'Drama' },
    { id: 18, name: 'Duplicate' },
    { id: 53, name: 'Thriller' },
  ],
}

describe('Onboarding TMDB summary normalization', () => {
  it('normalizes movie detail payload to onboarding card shape', () => {
    const original = JSON.stringify(movie)

    assert.deepEqual(
      normalizeOnboardingMediaSummary(
        movie,
        'movie',
      ),
      {
        id: 550,
        mediaType: 'movie',
        title: 'Fight Club',
        overview: 'Plot',
        posterPath: '/poster.jpg',
        backdropPath: '/backdrop.jpg',
        releaseDate: '1999-10-15',
        voteAverage: 8.4,
        voteCount: 100,
        genreIds: [18, 53],
        popularity: 50,
      },
    )

    assert.equal(
      JSON.stringify(movie),
      original,
    )
  })

  it('normalizes TV names, dates and genres', () => {
    const result = normalizeOnboardingMediaSummary(
      {
        ...movie,
        id: 1399,
        title: undefined,
        name: ' Game of Thrones ',
        release_date: undefined,
        first_air_date: '2011-04-17',
      },
      'tv',
    )

    assert.equal(
      result.title,
      'Game of Thrones',
    )
    assert.equal(
      result.releaseDate,
      '2011-04-17',
    )
    assert.deepEqual(
      result.genreIds,
      [18, 53],
    )
  })

  it('rejects malformed, mismatched and adult media', () => {
    for (const raw of [
      null,
      {},
      { id: 1, title: ' ' },
      {
        id: 1,
        title: 'Movie',
        adult: true,
      },
      {
        id: 1,
        title: 'Movie',
        media_type: 'tv',
      },
    ]) {
      assert.throws(
        () => normalizeOnboardingMediaSummary(
          raw,
          'movie',
        ),
        { code: 'invalid' },
      )
    }
  })
})

describe('Onboarding TMDB summary service', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = mock.method(
      globalThis,
      'fetch',
      async () => new Response(
        JSON.stringify(movie),
      ),
    )
  })

  afterEach(() => {
    mock.restoreAll()
  })

  it('loads one localized summary without append data', async () => {
    const signal = new AbortController().signal

    const result = await getOnboardingMediaSummary({
      mediaType: 'movie',
      tmdbId: 550,
      language: 'fr-FR',
      signal,
    })

    assert.equal(result.id, 550)

    const [
      url,
      options,
    ] = fetchMock.mock.calls[0].arguments

    assert.equal(
      url,
      '/api/tmdb/movie/550?language=fr-FR',
    )
    assert.equal(options.signal, signal)
    assert.equal(fetchMock.mock.callCount(), 1)
  })

  it('rejects invalid identity before fetch', async () => {
    await assert.rejects(
      getOnboardingMediaSummary({
        mediaType: 'person',
        tmdbId: 1,
      }),
      { code: 'missing' },
    )

    await assert.rejects(
      getOnboardingMediaSummary({
        mediaType: 'movie',
        tmdbId: '01',
      }),
      { code: 'missing' },
    )

    assert.equal(fetchMock.mock.callCount(), 0)
  })

  it('rejects a mismatched upstream id', async () => {
    await assert.rejects(
      getOnboardingMediaSummary({
        mediaType: 'movie',
        tmdbId: 551,
      }),
      { code: 'invalid' },
    )
  })
})
