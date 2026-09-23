import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { isValidSeriesId, isAllowedTvDetailRequest, TV_DETAIL_APPEND, MOVIE_DETAIL_APPEND } from '../../src/features/catalog/validation/detailRouteValidation.js'
import { normalizeTvShowDetails, getYearRange, normalizeEpisode, normalizeSeasons, selectCharacter } from '../../src/features/catalog/services/normalizeTvShowDetails.js'
import { getTvShowDetails } from '../../src/features/catalog/services/tvShowDetailsService.js'
import { formatRuntime, selectTrailer } from '../../src/features/catalog/services/detailHelpers.js'
import { getTmdbErrorMessage } from '../../src/features/catalog/services/tmdbErrors.js'
const minimal = { id: 1, name: ' Synthetic Show ' }
const episode = (patch = {}) => ({ id: 10, name: ' Episode ', season_number: 1, episode_number: 2, air_date: '2020-01-02', runtime: 45, overview: 'Plot', ...patch })

describe('TV route and exact proxy contract', () => {
  for (const id of [1,'1','1396',Number.MAX_SAFE_INTEGER]) it(`accepts ${id}`,()=>assert.ok(isValidSeriesId(id)))
  for (const id of [null,undefined,'',0,-1,'01','+1',' 1 ','1.0',1.5,'1e3','abc','1/seasons',Number.MAX_SAFE_INTEGER+1]) it(`rejects ${id}`,()=>assert.equal(isValidSeriesId(id),false))
  const allowed=(path,append=TV_DETAIL_APPEND,extra='')=>isAllowedTvDetailRequest(new URL(`http://localhost/api/tmdb${path}?language=en-US&append_to_response=${append}${extra}`))
  it('allows only TV-specific append on canonical IDs',()=>{assert.ok(allowed('/tv/1396'));assert.equal(allowed('/tv/1396',MOVIE_DETAIL_APPEND),false)})
  for (const path of ['/tv/01','/tv/abc','/tv/1/season/1','/movie/1','/person/1']) it(`blocks ${path}`,()=>assert.equal(allowed(path),false))
  for (const extra of ['&page=1','&language=en-US','&api_key=synthetic']) it(`blocks extra ${extra}`,()=>assert.equal(allowed('/tv/1',TV_DETAIL_APPEND,extra),false))
})
describe('TV normalization', () => {
  it('normalizes exact core fields and deduplicates named entities/countries without mutation',()=>{
    const raw={...minimal,original_name:' Original ',tagline:' Tag ',overview:'Plot',first_air_date:'2016-01-01',last_air_date:'2022-02-02',status:'Ended',type:'Scripted',in_production:false,episode_run_time:[null,45],original_language:'en',origin_country:['US','US','GB',null,'bad'],created_by:[{id:1,name:' Creator '},{id:1,name:'Duplicate'}],networks:[{id:2,name:'Network'},{id:2,name:'Network'}],production_companies:[{id:3,name:'Studio'},{id:3,name:'Studio'}],genres:[{id:18,name:' Drama '}],number_of_seasons:6,number_of_episodes:60,poster_path:'/poster.jpg',backdrop_path:'/back.jpg',vote_average:8.5,vote_count:10,extra:'discard'}
    const original=JSON.stringify(raw),data=normalizeTvShowDetails(raw)
    assert.equal(data.name,'Synthetic Show');assert.equal(data.originalName,'Original');assert.equal(data.tagline,'Tag');assert.equal(data.yearRange,'2016–2022');assert.equal(data.episodeRuntime,45)
    assert.deepEqual(data.originCountries,['US','GB']);assert.deepEqual(data.creators,[{id:1,name:'Creator'}]);assert.deepEqual(data.networks,[{id:2,name:'Network'}]);assert.deepEqual(data.productionCompanies,[{id:3,name:'Studio'}])
    assert.equal(data.numberOfSeasons,6);assert.equal(data.numberOfEpisodes,60);assert.equal(data.inProduction,false);assert.equal(data.type,'Scripted');assert.equal(data.originalLanguage,'en');assert.equal(data.voteAverage,8.5);assert.equal(data.voteCount,10)
    assert.equal(Object.hasOwn(data,'extra'),false);assert.equal(JSON.stringify(raw),original)
  })
  for(const raw of [null,undefined,{},[],{id:0,name:'Bad'},{id:1,name:''},{id:1,name:2}]) it(`rejects malformed core ${JSON.stringify(raw)}`,()=>assert.throws(()=>normalizeTvShowDetails(raw),{code:'invalid'}))
  it('handles null and malformed optional data without fictional values',()=>{
    const data=normalizeTvShowDetails({...minimal,aggregate_credits:null,created_by:[null,{}],seasons:'bad',episode_run_time:[0,-1,'45'],number_of_episodes:-1,number_of_seasons:NaN,in_production:'false',original_language:3,content_ratings:{results:[null]},homepage:'javascript:alert(1)',recommendations:{results:null},poster_path:'https://evil.invalid/a.jpg'})
    for(const key of ['episodeRuntime','firstAirDate','lastAirDate','yearRange','numberOfEpisodes','numberOfSeasons','inProduction','homepage','contentRating','trailer','posterPath','lastEpisode','nextEpisode'])assert.equal(data[key],null)
    for(const key of ['cast','seasons','creators','recommendations'])assert.deepEqual(data[key],[])
  })
  const ranges=[['2016-01-01','2022-01-01',false,'Ended','2016–2022'],['2020-01-01','2024-01-01',true,'Returning Series','2020–present'],['2020-01-01',null,null,'Returning Series','2020–present'],['2020-01-01',null,null,'','2020'],['2020-01-01','2020-06-01',false,'Ended','2020'],[null,'2022-01-01',false,'Ended',null],['bad','2022-01-01',false,'Ended',null],['2020-01-01','2019-01-01',false,'Ended','2020'],['2016-01-01','2022-01-01',false,'Canceled','2016–2022']]
  for(const [first,last,production,status,expected] of ranges)it(`yearRange ${first}/${last}/${status}`,()=>assert.equal(getYearRange(first,last,production,status),expected))
  it('chooses a valid runtime and falls back to the last episode, formatting via shared helper',()=>{
    assert.equal(normalizeTvShowDetails({...minimal,episode_run_time:[0,'45',60,30]}).episodeRuntime,60)
    assert.equal(normalizeTvShowDetails({...minimal,episode_run_time:[],last_episode_to_air:episode()}).episodeRuntime,45)
    assert.equal(formatRuntime(75),'1h 15m')
  })
  it('uses US content rating only',()=>{
    assert.equal(normalizeTvShowDetails({...minimal,content_ratings:{results:[{iso_3166_1:'GB',rating:'15'},{iso_3166_1:'US',rating:' '},{iso_3166_1:'US',rating:' TV-MA '}]}}).contentRating,'TV-MA')
    assert.equal(normalizeTvShowDetails({...minimal,content_ratings:{results:[{iso_3166_1:'GB',rating:'15'}]}}).contentRating,null)
  })
  for(const homepage of ['javascript:alert(1)','//example.invalid','https://user:pass@example.invalid',null]) it(`filters homepage ${homepage}`,()=>assert.equal(normalizeTvShowDetails({...minimal,homepage}).homepage,null))
  it('accepts HTTP(S) homepage',()=>assert.equal(normalizeTvShowDetails({...minimal,homepage:'https://example.invalid/'}).homepage,'https://example.invalid/'))
  it('sorts/deduplicates aggregate cast and limits to 12',()=>{
    const cast=Array.from({length:16},(_,i)=>({id:i+1,name:`Actor ${i}`,order:15-i,total_episode_count:i+1,roles:[{character:'Role',episode_count:2}],profile_path:'/photo.jpg'}))
    const original=JSON.stringify(cast),data=normalizeTvShowDetails({...minimal,aggregate_credits:{cast:[null,...cast,cast[15]]}})
    assert.equal(data.cast.length,12);assert.equal(data.cast[0].id,16);assert.equal(data.cast[0].episodeCount,16);assert.equal(data.cast[0].character,'Role');assert.equal(JSON.stringify(cast),original)
  })
  it('chooses the most frequent role then alphabetically, tolerating invalid counts',()=>{
    const roles=[{character:'Zeta',episode_count:5},{character:'Alpha',episode_count:5},{character:'Other',episode_count:1},null]
    assert.equal(selectCharacter(roles),'Alpha');assert.equal(selectCharacter([...roles].reverse()),'Alpha');assert.equal(selectCharacter([{character:'Solo',episode_count:-1}]),'Solo');assert.equal(selectCharacter([null,{}]),'')
    assert.equal(normalizeTvShowDetails({...minimal,aggregate_credits:{cast:[{id:1,name:'Actor',total_episode_count:0}]}}).cast[0].episodeCount,null)
  })
  it('reuses the trailer priority and safe key algorithm',()=>{
    const teaser={site:'YouTube',key:'aaaaaaaaaaa',type:'Teaser'},trailer={site:'YouTube',key:'bbbbbbbbbbb',type:'Trailer'},official={...trailer,key:'ccccccccccc',official:true}
    assert.deepEqual(normalizeTvShowDetails({...minimal,videos:{results:[teaser,trailer,official]}}).trailer,selectTrailer([official,trailer,teaser]))
    assert.equal(normalizeTvShowDetails({...minimal,videos:{results:[trailer,official]}}).trailer.url,'https://www.youtube.com/watch?v=ccccccccccc')
  })
  it('normalizes only first-page TV recommendations and excludes self/movie/adult/duplicates',()=>{
    const data=normalizeTvShowDetails({...minimal,recommendations:{page:1,results:[minimal,{id:2,name:'Other'},{id:2,name:'Duplicate'},{id:3,title:'Movie',media_type:'movie'},{id:4,name:'Adult',adult:true}]}})
    assert.equal(data.recommendations.length,1);assert.equal(data.recommendations[0].mediaType,'tv');assert.equal(data.recommendations[0].title,'Other')
    assert.deepEqual(normalizeTvShowDetails({...minimal,recommendations:{page:2,results:[{id:2,name:'Other'}]}}).recommendations,[])
  })
})
describe('Seasons and episodes',()=>{
  it('validates and sorts seasons including Specials, deduplicating IDs and numbers',()=>{
    const raw=[{id:2,name:'Second',season_number:2,episode_count:8},{id:1,name:'First',season_number:1},{id:3,name:'Specials',season_number:0},null,{id:0,name:'Bad',season_number:3},{id:4,name:'',season_number:4},{id:5,name:'Bad',season_number:-1},{id:6,name:'Bad',season_number:1},{id:2,name:'Bad',season_number:5}]
    const original=JSON.stringify(raw),seasons=normalizeSeasons(raw)
    assert.deepEqual(seasons.map(s=>s.seasonNumber),[0,1,2]);assert.equal(seasons[0].name,'Specials');assert.equal(seasons[2].episodeCount,8);assert.equal(seasons[1].posterPath,null);assert.equal(JSON.stringify(raw),original)
  })
  it('preserves season dates/overview while filtering extra fields',()=>{const [s]=normalizeSeasons([{id:1,name:'First',season_number:1,air_date:'2020-01-01',poster_path:'/p.jpg',overview:' Plot ',extra:1}]);assert.equal(s.airDate,'2020-01-01');assert.equal(s.overview,'Plot');assert.equal(Object.hasOwn(s,'extra'),false)})
  it('normalizes last/next episode, including Specials season',()=>{
    const data=normalizeTvShowDetails({...minimal,last_episode_to_air:episode(),next_episode_to_air:episode({id:11,season_number:0,episode_number:1,air_date:null})})
    assert.deepEqual(data.lastEpisode,{id:10,name:'Episode',seasonNumber:1,episodeNumber:2,airDate:'2020-01-02',overview:'Plot',runtime:45});assert.equal(data.nextEpisode.seasonNumber,0);assert.equal(data.nextEpisode.airDate,null)
  })
  for(const raw of [null,{},episode({id:0}),episode({name:' '}),episode({season_number:-1}),episode({episode_number:0})])it(`rejects malformed episode ${JSON.stringify(raw)}`,()=>assert.equal(normalizeEpisode(raw),null))
})
describe('TV details service',()=>{
  let fetchMock
  beforeEach(()=>{fetchMock=mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify(minimal)))})
  afterEach(()=>mock.restoreAll())
  it('sends one relative request with exact append, signal and no credentials',async()=>{
    const signal=new AbortController().signal;await getTvShowDetails({seriesId:'1',signal});const [url,options]=fetchMock.mock.calls[0].arguments
    assert.equal(url,'/api/tmdb/tv/1?language=en-US&append_to_response=aggregate_credits%2Cvideos%2Ccontent_ratings%2Crecommendations');assert.deepEqual(options.headers,{Accept:'application/json'});assert.equal(options.signal,signal);assert.equal(options.credentials,'omit');assert.equal(fetchMock.mock.callCount(),1)
  })
  it('does not request invalid ID',async()=>{await assert.rejects(getTvShowDetails({seriesId:'01'}),{code:'missing'});assert.equal(fetchMock.mock.callCount(),0)})
  for(const [status,code] of [[404,'missing'],[400,'request'],[401,'access'],[403,'access'],[429,'limit'],[500,'server']]) it(`sanitizes HTTP ${status}`,async()=>{fetchMock.mock.mockImplementation(async()=>new Response('RAW_PRIVATE',{status}));await assert.rejects(getTvShowDetails({seriesId:1}),e=>e.code===code&&!getTmdbErrorMessage(e).includes('RAW'))})
  it('sanitizes network failure',async()=>{fetchMock.mock.mockImplementation(async()=>{throw Error('RAW_PRIVATE')});await assert.rejects(getTvShowDetails({seriesId:1}),{code:'network'})})
  it('rejects invalid JSON',async()=>{fetchMock.mock.mockImplementation(async()=>new Response('bad'));await assert.rejects(getTvShowDetails({seriesId:1}),{code:'invalid'})})
  it('rejects ID mismatch',async()=>{await assert.rejects(getTvShowDetails({seriesId:2}),{code:'invalid'})})
  it('aborts before request',async()=>{const c=new AbortController();c.abort();await assert.rejects(getTvShowDetails({seriesId:1,signal:c.signal}),{name:'AbortError'});assert.equal(fetchMock.mock.callCount(),0)})
  it('discards cancelled body',async()=>{const c=new AbortController();fetchMock.mock.mockImplementation(async()=>({ok:true,json:async()=>{c.abort();return minimal}}));await assert.rejects(getTvShowDetails({seriesId:1,signal:c.signal}),{name:'AbortError'})})
})
