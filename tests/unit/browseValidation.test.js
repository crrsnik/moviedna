import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BROWSE_VIEWS, normalizeGenre, normalizeGenres, normalizeBrowse, readBrowseParams, createBrowseParams, changeBrowse, isAllowedBrowseRequest } from '../../src/features/catalog/validation/browseValidation.js'
import { getPagination } from '../../src/features/catalog/validation/searchValidation.js'

describe('Browse URL state', () => {
  for (const [type, views] of Object.entries(BROWSE_VIEWS)) {
    for (const view of Object.keys(views)) it(`${type} accepts ${view}`, () => assert.deepEqual(normalizeBrowse(type, { view, page: 2 }), { view, genres: [], page: 2 }))
    for (const view of ['unknown', '__proto__', '', null]) it(`${type} defaults invalid ${view}`, () => assert.equal(normalizeBrowse(type, { view }).view, 'popular'))
  }
  for (const value of [1, '28', Number.MAX_SAFE_INTEGER]) it(`accepts genre ${value}`, () => assert.equal(normalizeGenre(value), Number(value)))
  for (const value of [null, '', 0, -1, 1.5, '01', '1e2', 'a', '28,18', Number.MAX_SAFE_INTEGER + 1]) it(`rejects genre ${value}`, () => assert.equal(normalizeGenre(value), null))
  for (const page of [-1, 0, 'abc', '01', 501, 1.5]) it(`resets invalid page ${page}`, () => assert.equal(normalizeBrowse('movie', { page }).page, 1))
  it('keeps view and multiple genres together', () => {
    assert.deepEqual(
      normalizeGenres('28,18,28'),
      [28, 18],
    )

    assert.equal(
      createBrowseParams(
        'movie',
        {
          genres: [28, 18],
          view: 'top-rated',
          page: 3,
        },
      ).toString(),
      'view=top-rated&genres=28%2C18&page=3',
    )

    assert.deepEqual(
      readBrowseParams(
        'tv',
        new URLSearchParams(
          'view=top-rated&genres=18,80&page=2',
        ),
      ),
      {
        view: 'top-rated',
        genres: [18, 80],
        page: 2,
      },
    )

    assert.equal(
      createBrowseParams(
        'person',
        {
          genres: [28],
          view: 'trending',
        },
      ).toString(),
      'view=trending&page=1',
    )
  })

  it('supports legacy single-genre URLs', () => {
    assert.deepEqual(
      readBrowseParams(
        'movie',
        new URLSearchParams(
          'genre=28&view=upcoming&page=2',
        ),
      ),
      {
        view: 'upcoming',
        genres: [28],
        page: 2,
      },
    )
  })

  it('resets page while preserving the other filters', () => {
    const current = {
      view: 'top-rated',
      genres: [28],
      page: 5,
    }

    assert.equal(
      changeBrowse(
        'movie',
        current,
        {
          genres: [28, 16],
        },
      ).toString(),
      'view=top-rated&genres=28%2C16&page=1',
    )

    assert.equal(
      changeBrowse(
        'movie',
        current,
        {
          view: 'upcoming',
        },
      ).toString(),
      'view=upcoming&genres=28&page=1',
    )

    assert.equal(
      changeBrowse(
        'movie',
        current,
        {
          genres: [],
        },
      ).toString(),
      'view=top-rated&page=1',
    )
  })

  it('pagination preserves either mode and clamps invalid targets', () => {
    assert.equal(changeBrowse('movie', { view: 'top-rated', page: 1 }, { page: 2 }).toString(), 'view=top-rated&page=2')
    assert.equal(changeBrowse('tv', { view: 'popular', genres: [18], page: 1 }, { page: 2 }).toString(), 'view=popular&genres=18&page=2')
    assert.equal(changeBrowse('tv', { view: 'popular', genres: [18], page: 1 }, { page: -1 }).get('page'), '1')
    assert.equal(getPagination(1, 10).previous, null)
    assert.equal(getPagination(10, 10).next, null)
    assert.equal(getPagination(20, 10).page, 10)
  })
})

describe('Browse proxy allowlist', () => {
  const allowed = (path) => isAllowedBrowseRequest(new URL(`http://localhost/api/tmdb${path}`))
  it('accepts only exact genre/list/discover query contracts', () => {
    assert.ok(allowed('/genre/movie/list?language=en-US'))
    assert.ok(allowed('/movie/popular?language=en-US&page=1'))
    assert.ok(allowed('/discover/movie?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=28,35&include_video=false'))
    assert.ok(allowed('/discover/tv?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=18,80&include_null_first_air_dates=false'))
  })
  for (const path of [
    '/movie/popular?language=en-US&page=1&include_adult=false',
    '/movie/popular?language=en-US&page=1&page=2',
    '/movie/popular?language=en-US&page=501',
    '/movie/popular?language=de-DE&page=1',
    '/movie/popular?language=en-US&page=1&target=elsewhere',
    '/genre/movie/list?language=en-US&page=1',
    '/discover/movie?language=en-US&page=1',
    '/discover/movie?language=en-US&page=1&sort_by=popularity.desc&include_adult=true&with_genres=28&include_video=false',
    '/discover/tv?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=18&include_video=false',
    '/discover/movie?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=-1&include_video=false',
    '/movie/123?language=en-US&page=1',
  ]) it(`rejects ${path}`, () => assert.equal(allowed(path), false))
})
