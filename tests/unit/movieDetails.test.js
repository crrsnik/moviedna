import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { isValidMovieId, isAllowedMovieDetailRequest, MOVIE_DETAIL_APPEND } from '../../src/features/catalog/validation/detailRouteValidation.js'
import { normalizeMovieDetails, formatRuntime, formatMoney, selectTrailer, selectCertification, safeHomepage } from '../../src/features/catalog/services/normalizeMovieDetails.js'
import { getMovieDetails } from '../../src/features/catalog/services/movieDetailsService.js'
import { getTmdbErrorMessage } from '../../src/features/catalog/services/tmdbErrors.js'
import { getTmdbBackdropUrl } from '../../src/features/catalog/services/tmdbImages.js'
const minimal = { id: 1, title: ' Synthetic Movie ' }
const video = (key = 'abcdefghijk', patch = {}) => ({ key, site: 'YouTube', type: 'Trailer', official: false, ...patch })

describe('Detail route and proxy validation', () => {
  for (const id of [1, '1', '27205', Number.MAX_SAFE_INTEGER]) it(`accepts ID ${id}`, () => assert.ok(isValidMovieId(id)))
  for (const id of [null, undefined, '', '0', 0, -1, '01', '+1', ' 1 ', '1.0', 1.5, '1e3', 'abc', '1/credits', Number.MAX_SAFE_INTEGER + 1]) it(`rejects ID ${id}`, () => assert.equal(isValidMovieId(id), false))
  const allowed = (url) => isAllowedMovieDetailRequest(new URL(url, 'http://localhost'))
  it('allows only the exact appended request', () => assert.ok(allowed(`/api/tmdb/movie/1?language=en-US&append_to_response=${MOVIE_DETAIL_APPEND}`)))
  for (const path of ['/movie/01', '/movie/abc', '/tv/1', '/movie/1/credits']) it(`blocks path ${path}`, () => assert.equal(allowed(`/api/tmdb${path}?language=en-US&append_to_response=${MOVIE_DETAIL_APPEND}`), false))
  for (const query of ['language=en-US', 'language=fr-FR&append_to_response='+MOVIE_DETAIL_APPEND, 'language=en-US&append_to_response=account_states', 'language=en-US&append_to_response='+MOVIE_DETAIL_APPEND+'&api_key=synthetic', 'language=en-US&language=en-US&append_to_response='+MOVIE_DETAIL_APPEND]) it(`blocks invalid query ${query}`, () => assert.equal(allowed('/api/tmdb/movie/1?'+query), false))
})
describe('Pure movie detail normalization', () => {
  it('normalizes core fields and excludes unknown data without mutation', () => {
    const raw = { ...minimal, original_title: ' Original ', tagline: ' Tag ', overview: 'Plot', poster_path: '/safe.jpg', backdrop_path: '/back.jpg', release_date: '2020-02-29', runtime: 148, status: 'Released', original_language: 'en', vote_average: 8.5, vote_count: 42, budget: 1000, revenue: 2000, genres: [{ id: 18, name: ' Drama ', extra: true }], production_countries: [{ iso_3166_1: 'US', name: 'United States', extra: true }], production_companies: [{ id: 5, name: 'Studio', extra: true }], homepage: 'https://example.invalid/movie', extra: 'discard' }
    const original = JSON.stringify(raw)
    const m = normalizeMovieDetails(raw)
    assert.equal(m.title, 'Synthetic Movie'); assert.equal(m.originalTitle, 'Original'); assert.equal(m.tagline, 'Tag')
    assert.equal(m.releaseYear, '2020'); assert.equal(m.runtime, 148); assert.equal(m.voteAverage, 8.5); assert.equal(m.voteCount, 42)
    assert.equal(m.posterPath, '/safe.jpg'); assert.equal(m.backdropPath, '/back.jpg'); assert.equal(m.budget, 1000); assert.equal(m.revenue, 2000)
    assert.deepEqual(m.genres, [{ id: 18, name: 'Drama' }]); assert.deepEqual(m.productionCountries, [{ code: 'US', name: 'United States' }]); assert.deepEqual(m.productionCompanies, [{ id: 5, name: 'Studio' }])
    assert.equal(Object.hasOwn(m, 'extra'), false); assert.equal(JSON.stringify(raw), original)
  })
  for (const raw of [null, undefined, [], {}, { id: 0, title: 'Bad' }, { id: 1, title: ' ' }, { id: 1, title: 1 }]) it(`rejects invalid core ${JSON.stringify(raw)}`, () => assert.throws(() => normalizeMovieDetails(raw), { code: 'invalid' }))
  it('handles absent or corrupt optional fields', () => {
    const m = normalizeMovieDetails({ ...minimal, runtime: '148', release_date: '2020-02-30', genres: [null, { id: -1, name: 'Bad' }], credits: null, videos: {}, recommendations: { results: null }, budget: -1, revenue: NaN, original_language: {}, poster_path: 'https://evil.invalid/a.jpg' })
    for (const key of ['runtime','releaseDate','releaseYear','budget','revenue','posterPath','certification','trailer','homepage','originalLanguage']) assert.equal(m[key], null)
    for (const key of ['cast','directors','writers','genres','recommendations','productionCountries','productionCompanies']) assert.deepEqual(m[key], [])
  })
  it('sorts cast, removes duplicates and limits to 12', () => {
    const cast = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, name: `Actor ${i}`, character: `Character ${i}`, order: 15 - i, profile_path: '/safe.jpg' }))
    const original = JSON.stringify(cast)
    const result = normalizeMovieDetails({ ...minimal, credits: { cast: [null, ...cast, cast[15], { id: 99, name: 'Late', order: -1 }] } }).cast
    assert.equal(result.length, 12); assert.equal(result[0].id, 16); assert.equal(result[11].id, 5)
    assert.deepEqual(Object.keys(result[0]).sort(), ['character','id','name','profilePath']); assert.equal(JSON.stringify(cast), original)
  })
  it('deduplicates crew per role and excludes other jobs', () => {
    const crew = [{ id: 1, name: 'Director', job: 'Director' }, { id: 1, name: 'Director', job: 'Director' }, { id: 2, name: 'Writer', job: 'Writer' }, { id: 2, name: 'Writer', job: 'Story' }, { id: 3, name: 'Screenwriter', job: 'Screenplay' }, { id: 4, name: 'Other', job: 'Producer' }, null]
    const m = normalizeMovieDetails({ ...minimal, credits: { crew } })
    assert.deepEqual(m.directors, [{ id: 1, name: 'Director' }]); assert.deepEqual(m.writers.map(x=>x.id), [2,3])
  })
  it('normalizes/deduplicates first-page movie recommendations without current movie or unsafe items', () => {
    const m = normalizeMovieDetails({ ...minimal, recommendations: { page: 1, results: [minimal, { id: 2, title: 'Other' }, { id: 2, title: 'Duplicate' }, { id: 3, name: 'TV', media_type: 'tv' }, null, { id: 4, title: 'Adult', adult: true }] } })
    assert.equal(m.recommendations.length, 1); assert.equal(m.recommendations[0].mediaType, 'movie')
    assert.equal(normalizeMovieDetails({ ...minimal, recommendations: { page: 2, results: [{ id: 2, title: 'Other' }] } }).recommendations.length, 0)
    assert.equal(normalizeMovieDetails({ ...minimal, recommendations: { results: Array.from({length:30},(_,i)=>({id:i+2,title:'Other'})) } }).recommendations.length, 20)
  })
  for (const [minutes, expected] of [[148,'2h 28m'],[120,'2h'],[45,'45m'],[1,'1m'],[0,null],[-1,null],[1.5,null],[NaN,null],[null,null]]) it(`formats runtime ${minutes}`, () => assert.equal(formatRuntime(minutes), expected))
  for (const value of [0,-1,NaN,Infinity,null,'100',1.5]) it(`hides invalid budget/revenue ${value}`, () => { assert.equal(formatMoney(value), null); const m=normalizeMovieDetails({...minimal,budget:value,revenue:value}); assert.equal(m.budget,null);assert.equal(m.revenue,null) })
  it('formats positive money as USD', () => assert.equal(formatMoney(1234567), '$1,234,567'))
})
describe('Safe external URLs and release metadata', () => {
  it('prioritizes official trailer then trailer then teaser', () => {
    const official=video('bbbbbbbbbbb',{official:true}), trailer=video(), teaser=video('ccccccccccc',{type:'Teaser'})
    assert.equal(selectTrailer([teaser,trailer,official]).url,'https://www.youtube.com/watch?v=bbbbbbbbbbb')
    assert.equal(selectTrailer([teaser,trailer]).type,'Trailer'); assert.equal(selectTrailer([teaser]).type,'Teaser')
    assert.equal(selectTrailer([trailer,official]).url, selectTrailer([official,trailer]).url)
  })
  it('rejects unsafe or unsupported videos', () => assert.equal(selectTrailer([null,video('https://bad'),video('abcdefghijk',{site:'Vimeo'}),video('abcdefghijk',{type:'Clip'})]),null))
  it('deterministically breaks same-priority ties',()=>assert.equal(selectTrailer([video('bbbbbbbbbbb'),video('aaaaaaaaaaa')]).url,'https://www.youtube.com/watch?v=aaaaaaaaaaa'))
  it('prefers US theatrical then limited release and ignores other countries', () => {
    const release=(type,certification)=>({type,certification})
    const data=[{iso_3166_1:'GB',release_dates:[release(3,'15')]},{iso_3166_1:'US',release_dates:[release(4,'R'),release(2,'PG'),release(3,' PG-13 ')]}]
    assert.equal(selectCertification(data),'PG-13');data[1].release_dates.pop();assert.equal(selectCertification(data),'PG');data[1].release_dates.pop();assert.equal(selectCertification(data),'R')
    assert.equal(selectCertification([{iso_3166_1:'GB',release_dates:[release(3,'15')]}]),null)
    assert.equal(selectCertification([{iso_3166_1:'US',release_dates:[null,release(3,' ')]}]),null)
  })
  for(const value of ['javascript:alert(1)','data:text/html,bad','//example.invalid','ftp://example.invalid','https://user:pass@example.invalid','https://','https://example.invalid/\npath',null,{}]) it(`rejects unsafe homepage ${String(value)}`,()=>assert.equal(safeHomepage(value),null))
  for(const value of ['https://example.invalid/movie','http://example.invalid/']) it(`accepts ${value}`,()=>assert.equal(safeHomepage(value),value))
  it('allows only safe backdrop paths/sizes',()=>{assert.equal(getTmdbBackdropUrl('/safe.jpg'),'https://image.tmdb.org/t/p/w1280/safe.jpg');assert.equal(getTmdbBackdropUrl('/../safe.jpg'),null);assert.equal(getTmdbBackdropUrl('https://example.invalid/a.jpg'),null);assert.equal(getTmdbBackdropUrl('/safe.jpg','bad'),null)})
})
describe('Movie detail service mocked transport', () => {
  let fetchMock
  beforeEach(()=>{fetchMock=mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify(minimal)))})
  afterEach(()=>mock.restoreAll())
  it('uses one relative request, exact parameters, AbortSignal and no authorization',async()=>{
    const signal=new AbortController().signal
    await getMovieDetails({movieId:'1',signal})
    const [url,options]=fetchMock.mock.calls[0].arguments
    assert.equal(url,'/api/tmdb/movie/1?language=en-US&append_to_response=credits%2Cvideos%2Crelease_dates%2Crecommendations')
    assert.deepEqual(options.headers,{Accept:'application/json'});assert.equal(options.signal,signal);assert.equal(options.credentials,'omit')
  })
  it('does not fetch invalid IDs',async()=>{await assert.rejects(getMovieDetails({movieId:'01'}),{code:'missing'});assert.equal(fetchMock.mock.callCount(),0)})
  for(const [status,code] of [[404,'missing'],[400,'request'],[401,'access'],[403,'access'],[429,'limit'],[500,'server']]) it(`sanitizes HTTP ${status}`,async()=>{fetchMock.mock.mockImplementation(async()=>new Response('RAW_PRIVATE',{status}));await assert.rejects(getMovieDetails({movieId:1}),error=>error.code===code&&!getTmdbErrorMessage(error).includes('RAW'))})
  it('sanitizes network errors',async()=>{fetchMock.mock.mockImplementation(async()=>{throw Error('RAW_PRIVATE')});await assert.rejects(getMovieDetails({movieId:1}),{code:'network'})})
  it('rejects invalid JSON',async()=>{fetchMock.mock.mockImplementation(async()=>new Response('bad'));await assert.rejects(getMovieDetails({movieId:1}),{code:'invalid'})})
  it('rejects a mismatched response ID',async()=>{await assert.rejects(getMovieDetails({movieId:2}),{code:'invalid'})})
  it('propagates cancellation before fetch',async()=>{const c=new AbortController();c.abort();await assert.rejects(getMovieDetails({movieId:1,signal:c.signal}),{name:'AbortError'});assert.equal(fetchMock.mock.callCount(),0)})
  it('discards a body cancelled during parsing',async()=>{const c=new AbortController();fetchMock.mock.mockImplementation(async()=>({ok:true,json:async()=>{c.abort();return minimal}}));await assert.rejects(getMovieDetails({movieId:1,signal:c.signal}),{name:'AbortError'})})
})
