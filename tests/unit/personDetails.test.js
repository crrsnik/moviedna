import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { isValidPersonId, isAllowedPersonDetailRequest, PERSON_DETAIL_APPEND, getMediaDetailPath } from '../../src/features/catalog/validation/detailRouteValidation.js'
import { normalizePersonDetails, normalizePersonCredits, normalizePersonExternalLinks } from '../../src/features/catalog/services/normalizePersonDetails.js'
import { getPersonDetails } from '../../src/features/catalog/services/personDetailsService.js'
import { getTmdbErrorMessage } from '../../src/features/catalog/services/tmdbErrors.js'
const minimal = { id: 1, name: ' Synthetic Person ' }
const movie = (patch = {}) => ({ id: 10, media_type: 'movie', title: 'Film', release_date: '2020-01-02', ...patch })
const tv = (patch = {}) => ({ id: 10, media_type: 'tv', name: 'Series', first_air_date: '2021-01-02', ...patch })

describe('Person routes and proxy contract', () => {
  for (const id of [1, '1', '6193', Number.MAX_SAFE_INTEGER]) it(`accepts ${id}`, () => assert.ok(isValidPersonId(id)))
  for (const id of [null, undefined, '', '01', ' 1 ', '+1', '1.0', '1e2', 0, -1, 1.1, 'abc', '1/images', Number.MAX_SAFE_INTEGER + 1]) it(`rejects ${id}`, () => assert.equal(isValidPersonId(id), false))
  const url = (path = '/person/1', params = `language=en-US&append_to_response=${PERSON_DETAIL_APPEND}`) => new URL(`http://localhost/api/tmdb${path}?${params}`)
  it('allows exact person append', () => assert.ok(isAllowedPersonDetailRequest(url())))
  for (const path of ['/person/01', '/person/0', '/person/1/images', '/movie/1', '/tv/1', '/person/1/']) it(`rejects ${path}`, () => assert.equal(isAllowedPersonDetailRequest(url(path)), false))
  for (const params of ['language=en-US', `language=fr-FR&append_to_response=${PERSON_DETAIL_APPEND}`, `language=en-US&append_to_response=${PERSON_DETAIL_APPEND}&page=1`, `language=en-US&append_to_response=${PERSON_DETAIL_APPEND}&language=en-US`, 'language=en-US&append_to_response=credits']) it(`rejects query ${params}`, () => assert.equal(isAllowedPersonDetailRequest(url('/person/1', params)), false))
  it('builds only movie/TV routes', () => {
    assert.equal(getMediaDetailPath({ id: 2, mediaType: 'movie' }), '/movies/2')
    assert.equal(getMediaDetailPath({ id: 2, mediaType: 'tv' }), '/tv/2')
    for (const media of [null, {}, { id: '01', mediaType: 'tv' }, { id: 2, mediaType: 'person' }]) assert.equal(getMediaDetailPath(media), null)
  })
})
describe('Person model', () => {
  it('normalizes exact fields without mutation', () => {
    const raw = { ...minimal, birthday: '1980-02-02', deathday: '2020-02-02', place_of_birth: ' Place ', known_for_department: ' Acting ', biography: ' Line one\nLine two ', gender: 2, profile_path: '/p.jpg', unknown: 'discard' }
    const before = JSON.stringify(raw), data = normalizePersonDetails(raw)
    assert.deepEqual(data, { id: 1, name: 'Synthetic Person', birthday: '1980-02-02', deathday: '2020-02-02', placeOfBirth: 'Place', knownForDepartment: 'Acting', biography: 'Line one\nLine two', genderLabel: 'Male', profilePath: '/p.jpg', alsoKnownAs: [], homepage: null, externalLinks: [], images: [], knownFor: [], actingCredits: [], crewCredits: [] })
    assert.equal(JSON.stringify(raw), before)
  })
  for (const [gender, label] of [[0, null], [1, 'Female'], [2, 'Male'], [3, 'Non-binary'], [4, null], ['1', null], [null, null]]) it(`gender ${gender}`, () => assert.equal(normalizePersonDetails({ ...minimal, gender }).genderLabel, label))
  for (const raw of [null, [], {}, { id: 0, name: 'Name' }, { id: '1', name: 'Name' }, { id: 1, name: ' ' }]) it(`rejects core ${JSON.stringify(raw)}`, () => assert.throws(() => normalizePersonDetails(raw), { code: 'invalid' }))
  it('handles damaged nullable optional fields', () => {
    const data = normalizePersonDetails({ ...minimal, biography: {}, birthday: '2021-02-29', deathday: 3, profile_path: 'https://evil.invalid/a.jpg', images: null, combined_credits: { cast: {}, crew: null }, also_known_as: [null, 3, ' '] })
    assert.equal(data.biography, ''); assert.equal(data.birthday, null); assert.equal(data.deathday, null); assert.equal(data.profilePath, null); assert.deepEqual(data.knownFor, []); assert.deepEqual(data.alsoKnownAs, [])
  })
  it('trims, deduplicates and caps aliases', () => assert.deepEqual(normalizePersonDetails({ ...minimal, also_known_as: [' Alias ', 'Alias', ...Array.from({ length: 20 }, (_, i) => `Name ${i}`)] }).alsoKnownAs, ['Alias', ...Array.from({ length: 11 }, (_, i) => `Name ${i}`)]))
  it('validates, excludes main image, deduplicates, sorts and caps photos', () => {
    const paths = ['/main.jpg', '/b.jpg', '/b.jpg', 'https://evil.invalid/p.jpg', '/../p.jpg', null, ...Array.from({ length: 10 }, (_, i) => `/a${i}.jpg`)]
    const raw = { ...minimal, profile_path: '/main.jpg', images: { profiles: paths.map(file_path => ({ file_path, extra: 1 })) } }, before = JSON.stringify(raw)
    assert.deepEqual(normalizePersonDetails(raw).images, Array.from({ length: 8 }, (_, i) => `/a${i}.jpg`)); assert.equal(JSON.stringify(raw), before)
  })
  for (const homepage of ['javascript:alert(1)', '//evil.invalid', 'https://user:pass@example.invalid', 'https://example.invalid/\npath']) it('rejects unsafe homepage', () => assert.equal(normalizePersonDetails({ ...minimal, homepage }).homepage, null))
  it('allows safe homepage', () => assert.equal(normalizePersonDetails({ ...minimal, homepage: 'https://example.invalid' }).homepage, 'https://example.invalid/'))
  it('builds fixed-base encoded external links only', () => {
    const links = normalizePersonExternalLinks({ imdb_id: 'nm123', instagram_id: 'café', twitter_id: 'test_user', facebook_id: 'page.name', unknown: 'https://evil.invalid' })
    assert.deepEqual(links.map(l => l.url), ['https://www.imdb.com/name/nm123', 'https://www.instagram.com/caf%C3%A9', 'https://x.com/test_user', 'https://www.facebook.com/page.name'])
  })
  for (const value of ['https://evil.invalid', '..', '/path', 'a?b', 'a#b', 'a\nb', {}, null]) it(`rejects unsafe external ID ${JSON.stringify(value)}`, () => assert.deepEqual(normalizePersonExternalLinks({ imdb_id: value, instagram_id: value, twitter_id: value, facebook_id: value }), []))
})
describe('Combined credits', () => {
  it('filters adult, unknown, missing types and malformed media', () => {
    const data = normalizePersonCredits([null, {}, movie({ adult: true }), movie({ id: 0 }), movie({ title: '' }), movie({ media_type: 'person' }), movie({ media_type: undefined }), tv()], 'acting')
    assert.equal(data.length, 1); assert.equal(data[0].mediaType, 'tv')
  })
  it('normalizes movie/TV fields, dates, scores and roles', () => {
    const [credit] = normalizePersonCredits([movie({ character: ' Hero ', poster_path: '/p.jpg', backdrop_path: '/b.jpg', vote_average: 8, vote_count: 20, popularity: 3 })], 'acting')
    assert.equal(credit.releaseYear, '2020'); assert.equal(credit.roleLabel, 'Hero'); assert.equal(credit.posterPath, '/p.jpg'); assert.equal(credit.backdropPath, '/b.jpg'); assert.equal(credit.voteAverage, 8); assert.equal(credit.voteCount, 20); assert.equal(credit.popularity, 3)
    const [series] = normalizePersonCredits([tv()], 'acting'); assert.equal(series.title, 'Series'); assert.equal(series.releaseDate, '2021-01-02')
  })
  it('merges characters by type + ID; preserves source', () => {
    const raw = [movie({ character: 'A' }), movie({ character: 'B' }), movie({ character: 'A' }), tv({ character: 'C' })], before = JSON.stringify(raw)
    const credits = normalizePersonCredits(raw, 'acting'); assert.equal(credits.length, 2); assert.equal(credits[1].roleLabel, 'A / B'); assert.equal(JSON.stringify(raw), before)
  })
  it('merges crew jobs with department fallback', () => assert.equal(normalizePersonCredits([movie({ job: 'Director' }), movie({ job: 'Writer' }), movie({ job: 'Director' }), movie({ department: 'Production' })], 'crew')[0].roleLabel, 'Director / Writer / Production'))
  it('sorts dated credits newest first, ties stable, undated last', () => {
    const result = normalizePersonCredits([movie({ id: 1, release_date: null }), movie({ id: 2 }), movie({ id: 3, release_date: '2024-01-01' }), movie({ id: 4 })], 'acting')
    assert.deepEqual(result.map(c => c.id), [3, 2, 4, 1])
  })
  it('deduplicates Known For, ranks by popularity then votes, deterministic ties and max 12', () => {
    const cast = Array.from({ length: 15 }, (_, i) => movie({ id: i + 1, popularity: i, vote_count: i }))
    const data = normalizePersonDetails({ ...minimal, combined_credits: { cast, crew: [movie({ id: 15, popularity: 14, vote_count: 14 }), tv({ id: 15, popularity: 14, vote_count: 20 })] } })
    assert.equal(data.knownFor.length, 12); assert.equal(data.knownFor[0].mediaType, 'tv'); assert.equal(data.knownFor[1].mediaType, 'movie'); assert.equal(new Set(data.knownFor.map(c => `${c.mediaType}:${c.id}`)).size, 12)
  })
})
describe('Person service', () => {
  let fetchMock
  beforeEach(() => { fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(minimal))) })
  afterEach(() => mock.restoreAll())
  it('one exact relative request, AbortSignal, no Authorization', async () => {
    const signal = new AbortController().signal; await getPersonDetails({ personId: '1', signal })
    const [url, options] = fetchMock.mock.calls[0].arguments
    assert.equal(url, '/api/tmdb/person/1?language=en-US&append_to_response=combined_credits%2Cimages%2Cexternal_ids'); assert.equal(options.signal, signal); assert.deepEqual(options.headers, { Accept: 'application/json' }); assert.equal(options.credentials, 'omit'); assert.equal(fetchMock.mock.callCount(), 1)
  })
  it('invalid ID never requests', async () => { await assert.rejects(getPersonDetails({ personId: '01' }), { code: 'missing' }); assert.equal(fetchMock.mock.callCount(), 0) })
  for (const [status, code] of [[400, 'request'], [401, 'access'], [403, 'access'], [404, 'missing'], [429, 'limit'], [500, 'server']]) it(`sanitizes ${status}`, async () => {
    fetchMock.mock.mockImplementation(async () => new Response('PRIVATE_UPSTREAM', { status })); await assert.rejects(getPersonDetails({ personId: 1 }), e => e.code === code && !getTmdbErrorMessage(e).includes('PRIVATE'))
  })
  it('sanitizes network failure', async () => { fetchMock.mock.mockImplementation(async () => { throw Error('PRIVATE') }); await assert.rejects(getPersonDetails({ personId: 1 }), { code: 'network' }) })
  it('rejects invalid JSON', async () => { fetchMock.mock.mockImplementation(async () => new Response('bad')); await assert.rejects(getPersonDetails({ personId: 1 }), { code: 'invalid' }) })
  it('rejects mismatched ID', async () => { await assert.rejects(getPersonDetails({ personId: 2 }), { code: 'invalid' }) })
  it('aborts before request', async () => { const c = new AbortController(); c.abort(); await assert.rejects(getPersonDetails({ personId: 1, signal: c.signal }), { name: 'AbortError' }); assert.equal(fetchMock.mock.callCount(), 0) })
  it('aborts during body', async () => { const c = new AbortController(); fetchMock.mock.mockImplementation(async () => ({ ok: true, json: async () => { c.abort(); return minimal } })); await assert.rejects(getPersonDetails({ personId: 1, signal: c.signal }), { name: 'AbortError' }) })
})
