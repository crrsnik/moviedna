import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BROWSE_VIEWS, normalizeGenre, normalizeBrowse, readBrowseParams, createBrowseParams, changeBrowse, isAllowedBrowseRequest } from '../../src/features/catalog/validation/browseValidation.js'
import { getPagination } from '../../src/features/catalog/validation/searchValidation.js'

describe('Browse URL state', () => {
  for (const [type, views] of Object.entries(BROWSE_VIEWS)) {
    for (const view of Object.keys(views)) it(`${type} accepts ${view}`, () => assert.deepEqual(normalizeBrowse(type, { view, page: 2 }), { view, genre: null, page: 2 }))
    for (const view of ['unknown', '__proto__', '', null]) it(`${type} defaults invalid ${view}`, () => assert.equal(normalizeBrowse(type, { view }).view, 'popular'))
  }
  for (const value of [1, '28', Number.MAX_SAFE_INTEGER]) it(`accepts genre ${value}`, () => assert.equal(normalizeGenre(value), Number(value)))
  for (const value of [null, '', 0, -1, 1.5, '01', '1e2', 'a', '28,18', Number.MAX_SAFE_INTEGER + 1]) it(`rejects genre ${value}`, () => assert.equal(normalizeGenre(value), null))
  for (const page of [-1, 0, 'abc', '01', 501, 1.5]) it(`resets invalid page ${page}`, () => assert.equal(normalizeBrowse('movie', { page }).page, 1))
  it('canonicalizes and prioritizes genre over view', () => {
    assert.equal(createBrowseParams('movie', { genre: 28, view: 'top-rated', page: 3 }).toString(), 'genre=28&page=3')
    assert.deepEqual(readBrowseParams('tv', new URLSearchParams('genre=-1&view=bad&page=0&other=1')), { genre: null, view: 'popular', page: 1 })
    assert.equal(createBrowseParams('person', { genre: 28, view: 'trending' }).toString(), 'view=trending&page=1')
  })
  it('resets page and removes the other mode for view/genre transitions', () => {
    const current = { view: 'top-rated', genre: null, page: 5 }
    assert.equal(changeBrowse('movie', current, { genre: 28 }).toString(), 'genre=28&page=1')
    assert.equal(changeBrowse('movie', { genre: 28, page: 5 }, { view: 'upcoming' }).toString(), 'view=upcoming&page=1')
    assert.equal(changeBrowse('movie', { genre: 28, page: 5 }, { genre: null }).toString(), 'view=popular&page=1')
  })
  it('pagination preserves either mode and clamps invalid targets', () => {
    assert.equal(changeBrowse('movie', { view: 'top-rated', page: 1 }, { page: 2 }).toString(), 'view=top-rated&page=2')
    assert.equal(changeBrowse('tv', { genre: 18, page: 1 }, { page: 2 }).toString(), 'genre=18&page=2')
    assert.equal(changeBrowse('tv', { genre: 18, page: 1 }, { page: -1 }).get('page'), '1')
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
    assert.ok(allowed('/discover/movie?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=28&include_video=false'))
    assert.ok(allowed('/discover/tv?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=18&include_null_first_air_dates=false'))
  })
  for (const path of [
    '/movie/popular?language=en-US&page=1&include_adult=false',
    '/movie/popular?language=en-US&page=1&page=2',
    '/movie/popular?language=en-US&page=501',
    '/movie/popular?language=fr-FR&page=1',
    '/movie/popular?language=en-US&page=1&target=elsewhere',
    '/genre/movie/list?language=en-US&page=1',
    '/discover/movie?language=en-US&page=1',
    '/discover/movie?language=en-US&page=1&sort_by=popularity.desc&include_adult=true&with_genres=28&include_video=false',
    '/discover/tv?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=18&include_video=false',
    '/discover/movie?language=en-US&page=1&sort_by=popularity.desc&include_adult=false&with_genres=-1&include_video=false',
    '/movie/123?language=en-US&page=1',
  ]) it(`rejects ${path}`, () => assert.equal(allowed(path), false))
})
