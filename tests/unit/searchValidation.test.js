import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeQuery, getQueryError, normalizeType, normalizePage, readSearchParams, createSearchParams, changeSearch, getPagination, isAllowedSearchRequest } from '../../src/features/catalog/validation/searchValidation.js'

describe('Search URL validation and pagination', () => {
  it('trims and collapses whitespace including tabs and newlines', () => assert.equal(normalizeQuery('  Star \n\t Wars  '), 'Star Wars'))
  for (const query of ['', ' ', 'x', 'a'.repeat(101), null]) it(`rejects query length ${query?.length}`, () => assert.ok(getQueryError(query)))
  for (const query of ['ab', 'a'.repeat(100)]) it(`accepts query length ${query.length}`, () => assert.equal(getQueryError(query), null))
  for (const type of ['all', 'movie', 'tv', 'person']) it(`accepts ${type}`, () => assert.equal(normalizeType(type), type))
  for (const type of [null, 'bad', 'Movie', '', {}]) it(`falls back for type ${String(type)}`, () => assert.equal(normalizeType(type), 'all'))
  for (const page of [0, -1, 1.5, '01', '1e2', 'abc', null, Infinity, 501, '9007199254740992']) it(`normalizes invalid page ${String(page)}`, () => assert.equal(normalizePage(page), 1))
  for (const page of [1, 25, 500, '2']) it(`accepts page ${page}`, () => assert.equal(normalizePage(page), Number(page)))
  it('builds and reads canonical encoded parameters', () => {
    const params = createSearchParams({ query: '  A & B  ', type: 'movie', page: 2 })
    assert.equal(params.toString(), 'q=A+%26+B&type=movie&page=2')
    assert.deepEqual(readSearchParams(params), { query: 'A & B', type: 'movie', page: 2 })
    assert.deepEqual(readSearchParams(new URLSearchParams()), { query: '', type: 'all', page: 1 })
  })
  it('resets on query/type changes and retains them on pagination', () => {
    const current = { query: 'Star Wars', type: 'movie', page: 4 }
    assert.equal(changeSearch(current, { query: 'Alien' }).get('page'), '1')
    assert.equal(changeSearch(current, { type: 'tv' }).get('page'), '1')
    assert.equal(changeSearch(current, { page: 3 }).toString(), 'q=Star+Wars&type=movie&page=3')
  })
  it('disables first/last controls and clamps unavailable pages', () => {
    assert.deepEqual(getPagination(1, 3), { page: 1, totalPages: 3, previous: null, next: 2 })
    assert.deepEqual(getPagination(9, 3), { page: 3, totalPages: 3, previous: 2, next: null })
    assert.deepEqual(getPagination(-2, 0), { page: 1, totalPages: 1, previous: null, next: null })
  })
  for (const type of ['multi', 'movie', 'tv', 'person']) it(`proxy allows ${type} with exact safe parameters`, () => assert.ok(isAllowedSearchRequest(new URL(`http://localhost/api/tmdb/search/${type}?query=Alien&language=en-US&page=1&include_adult=false`))))
  for (const suffix of ['&include_adult=true', '&api_key=synthetic', '&page=2', '&target=elsewhere']) it(`proxy rejects extra parameters ${suffix}`, () => assert.equal(isAllowedSearchRequest(new URL(`http://localhost/api/tmdb/search/movie?query=Alien&language=en-US&page=1&include_adult=false${suffix}`)), false))
})
