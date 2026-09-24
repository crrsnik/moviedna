import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase/firestore'
import { getMediaKey, normalizeMediaSnapshot, detailToSnapshot, normalizeLibraryView, libraryViewParams, savedMediaRoute } from '../../src/features/library/validation/libraryValidation.js'
import { normalizeSavedMedia, normalizeLibraryItems } from '../../src/features/library/services/normalizeSavedMedia.js'
import { createMediaLibraryService } from '../../src/features/library/services/createMediaLibraryService.js'
import { createLibraryAction } from '../../src/features/library/services/libraryAction.js'
import { toLibraryError } from '../../src/features/library/services/libraryErrors.js'
const media = { tmdbId: 123, mediaType: 'movie', title: 'Synthetic film', posterPath: '/poster.jpg', releaseYear: 2020 }
const data = patch => ({ ...media, favorite: true, watchlist: false, listIds: [], createdAt: new Timestamp(1, 0), updatedAt: new Timestamp(2, 0), ...patch })
const snap = (value, id = 'movie_123', metadata = {}) => ({ id, data: () => value, exists: () => value !== null, metadata })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
function harness(saved = null) {
  const auth = { currentUser: { uid: 'synthetic-owner' } }, calls = [], writes = [], listeners = []
  const deps = {
    auth, db: {},
    doc: (database, ...parts) => { assert.ok(database); calls.push(['doc', ...parts]); return parts.join('/') },
    collection: (database, ...parts) => { assert.ok(database); calls.push(['collection', ...parts]); return parts.join('/') },
    where: (...args) => args, query: (...args) => args,
    serverTimestamp: () => 'synthetic-server-time',
    onSnapshot: (target, options, next, error) => { const l = { target, options, next, error, stopped: false }; listeners.push(l); return () => { l.stopped = true } },
    runTransaction: async (_, callback) => {
      calls.push(['transaction']); if (deps.failure) throw deps.failure
      const tx = { get: async () => { await deps.beforeRead?.(); return snap(saved) }, set: (...args) => writes.push(['set', ...args]), update: (...args) => writes.push(['update', ...args]), delete: (...args) => writes.push(['delete', ...args]) }
      await callback(tx); if (deps.repeat) { writes.length = 0; saved = data({ watchlist: true }); await callback(tx) }
      await deps.afterCommit?.()
    },
  }
  return { service: createMediaLibraryService(deps), deps, auth, calls, writes, listeners }
}
describe('Library validation and saved model', () => {
  for (const type of ['movie', 'tv']) for (const id of [1, 999999999999]) it(`key ${type}/${id}`, () => assert.equal(getMediaKey(type, id), `${type}_${id}`))
  for (const [type, id] of [['person',1],['movie',0],['movie',-1],['tv',1.5],['tv','1'],['tv',1000000000000],['tv',NaN],[null,1]]) it(`invalid key ${type}/${id}`, () => assert.throws(() => getMediaKey(type,id),{code:'invalid-media'}))
  it('extracts only display snapshot', () => assert.deepEqual(detailToSnapshot('movie', { id:123,title:' Synthetic film ',posterPath:'/poster.jpg',releaseDate:'2020-01-02',overview:'discard',cast:[] }), media))
  it('TV names/dates and null optional snapshot fields', () => assert.deepEqual(detailToSnapshot('tv',{id:123,name:'Series',firstAirDate:null,posterPath:'https://evil.invalid/a.jpg'}),{tmdbId:123,mediaType:'tv',title:'Series',releaseYear:null,posterPath:null}))
  for (const title of ['', ' \t\n', null, 123, 'a'.repeat(201)]) it(`invalid title ${JSON.stringify(title)}`, () => assert.throws(() => normalizeMediaSnapshot({...media,title}),{code:'invalid-media'}))
  for (const year of [1799,2201,2000.5,'2000',NaN]) it(`invalid year normalizes to null ${year}`, () => assert.equal(normalizeMediaSnapshot({...media,releaseYear:year}).releaseYear,null))
  for (const path of ['https://evil.invalid/p.jpg','/../p.jpg','/p.jpg?x','/p.jpg#x','/p x.jpg','/p\\x.jpg']) it(`invalid poster ${path}`,()=>assert.equal(normalizeMediaSnapshot({...media,posterPath:path}).posterPath,null))
  for (const view of [null,undefined,'','bad','favorites','watchlist']) it(`view ${view}`,()=>assert.equal(libraryViewParams(view).toString(),`view=${view==='watchlist'?'watchlist':'favorites'}`))
  it('canonical routes',()=>{assert.equal(savedMediaRoute(media),'/movies/123');assert.equal(savedMediaRoute({...media,mediaType:'tv'}),'/tv/123');assert.equal(normalizeLibraryView('WATCHLIST'),'favorites')})
  it('normalizes timestamps without losing nanos',()=>assert.deepEqual(normalizeSavedMedia(snap(data())).updatedAt,{seconds:2,nanoseconds:0}))
  for (const patch of [{tmdbId:124},{mediaType:'tv'},{title:' '},{title:'a'.repeat(201)},{posterPath:'bad'},{releaseYear:'2020'},{favorite:1},{watchlist:null},{listIds:null},{listIds:[1]},{listIds:['bad']},{listIds:['a'.repeat(20),'a'.repeat(20)]},{listIds:Array.from({length:21},(_,i)=>String(i).padStart(20,'a'))},{favorite:false},{createdAt:null},{updatedAt:{seconds:1,nanoseconds:0}},{extra:true}]) it(`rejects corrupt ${JSON.stringify(patch)}`,()=>assert.throws(()=>normalizeSavedMedia(snap(data(patch))),{code:'invalid-data'}))
  for(const field of Object.keys(data()))it(`rejects missing ${field}`,()=>{const d=data();delete d[field];assert.throws(()=>normalizeSavedMedia(snap(d)),{code:'invalid-data'})})
  it('filters corruption and sorts by updated/created/title/key',()=>{
    const docs=[snap(data({title:'B'})),snap(data({title:'A',tmdbId:124}),'movie_124'),snap(data({tmdbId:125,updatedAt:new Timestamp(2,1)}),'movie_125'),snap(data({tmdbId:126,createdAt:new Timestamp(1,1)}),'movie_126'),snap(data({title:''}))]
    assert.deepEqual(normalizeLibraryItems({docs}).map(x=>x.tmdbId),[125,126,124,123])
  })
})
describe('Library transactions through injected boundary',()=>{
  for(const [method,field] of [['toggleFavorite','favorite'],['toggleWatchlist','watchlist']])it(`creates ${field}`,async()=>{
    const h=harness();await h.service[method]({uid:'synthetic-owner',media})
    assert.deepEqual(h.writes,[['set','users/synthetic-owner/savedMedia/movie_123',{...media,favorite:field==='favorite',watchlist:field==='watchlist',listIds:[],createdAt:'synthetic-server-time',updatedAt:'synthetic-server-time'}]])
  })
  it('preserves other flag/listIds/createdAt on update',async()=>{
    const h=harness(data({watchlist:true,listIds:['a'.repeat(20)]}));await h.service.toggleFavorite({uid:'synthetic-owner',media})
    assert.deepEqual(h.writes[0],['update','users/synthetic-owner/savedMedia/movie_123',{title:media.title,posterPath:media.posterPath,releaseYear:2020,favorite:false,updatedAt:'synthetic-server-time'}])
  })
  it('last membership deletes document',async()=>{const h=harness(data());await h.service.toggleFavorite({uid:'synthetic-owner',media});assert.equal(h.writes[0][0],'delete')})
  it('list membership prevents deletion',async()=>{const h=harness(data({listIds:['a'.repeat(20)]}));await h.service.toggleFavorite({uid:'synthetic-owner',media});assert.equal(h.writes[0][0],'update')})
  it('remove is explicit false, never re-adds missing document',async()=>{const h=harness();await h.service.removeFromView({uid:'synthetic-owner',media,view:'favorites'});assert.deepEqual(h.writes,[])})
  it('removing watchlist preserves favorite',async()=>{const h=harness(data({watchlist:true}));await h.service.removeFromView({uid:'synthetic-owner',media,view:'watchlist'});assert.equal(h.writes[0][2].watchlist,false);assert.equal(Object.hasOwn(h.writes[0][2],'favorite'),false)})
  it('transaction retry uses latest memberships',async()=>{const h=harness(data());h.deps.repeat=true;await h.service.toggleFavorite({uid:'synthetic-owner',media});assert.equal(h.writes[0][0],'update');assert.equal(Object.hasOwn(h.writes[0][2],'watchlist'),false)})
  it('identity mismatch refuses write',async()=>{const h=harness(data({tmdbId:124}));await assert.rejects(h.service.toggleFavorite({uid:'synthetic-owner',media}),{code:'invalid-data'});assert.deepEqual(h.writes,[])})
  for(const uid of [null,'other','bad/path'])it(`refuses UID ${uid} before Firestore`,async()=>{const h=harness();await assert.rejects(h.service.toggleFavorite({uid,media}),{code:'unauthenticated'});assert.deepEqual(h.calls,[])})
  it('unauthenticated refuses operation',async()=>{const h=harness();h.auth.currentUser=null;await assert.rejects(h.service.toggleFavorite({uid:'synthetic-owner',media}),{code:'unauthenticated'});assert.deepEqual(h.calls,[])})
  it('invalid media refuses operation before Firestore',async()=>{const h=harness();await assert.rejects(h.service.toggleFavorite({uid:'synthetic-owner',media:{...media,tmdbId:0}}),{code:'invalid-media'});assert.deepEqual(h.calls,[])})
  it('logout during read prevents write',async()=>{const h=harness();h.deps.beforeRead=()=>{h.auth.currentUser=null};await assert.rejects(h.service.toggleFavorite({uid:'synthetic-owner',media}),{code:'session'});assert.deepEqual(h.writes,[])})
  it('logout after commit does not report success to new session',async()=>{const h=harness();h.deps.afterCommit=()=>{h.auth.currentUser={uid:'synthetic-owner'}};await assert.rejects(h.service.toggleFavorite({uid:'synthetic-owner',media}),{code:'session'})})
  it('synchronous service lock blocks second write and unlocks',async()=>{
    const h=harness(),d=deferred();h.deps.afterCommit=()=>d.promise
    const first=h.service.toggleFavorite({uid:'synthetic-owner',media})
    await assert.rejects(h.service.toggleWatchlist({uid:'synthetic-owner',media}),{code:'pending'})
    d.resolve();await first;assert.equal(h.calls.filter(x=>x[0]==='transaction').length,1)
    await h.service.toggleWatchlist({uid:'synthetic-owner',media})
  })
  for(const code of ['permission-denied','unavailable','unauthenticated','aborted','unknown'])it(`safe transaction error ${code}`,async()=>{const h=harness();h.deps.failure={code,message:'PRIVATE_ERROR'};await assert.rejects(h.service.toggleFavorite({uid:'synthetic-owner',media}),e=>e.code===code&&!e.message.includes('PRIVATE'))})
})
describe('Library subscriptions and controller',()=>{
  it('document path, server metadata only, unsubscribe drops callbacks',()=>{
    const h=harness(),seen=[],errors=[];const stop=h.service.subscribeToSavedMedia({uid:'synthetic-owner',...media},v=>seen.push(v),e=>errors.push(e))
    const l=h.listeners[0];assert.equal(l.target,'users/synthetic-owner/savedMedia/movie_123');assert.equal(l.options.includeMetadataChanges,true)
    l.next(snap(data(),undefined,{hasPendingWrites:true}));l.next(snap(data(),undefined,{fromCache:true}));assert.equal(seen.length,0)
    l.next(snap(data()));assert.equal(seen.length,1);l.next(snap(null));assert.equal(seen[1],null)
    stop();l.next(snap(data()));l.error({code:'unavailable'});assert.equal(seen.length,2);assert.equal(errors.length,0);assert.ok(l.stopped)
  })
  for(const [view,field] of [['favorites','favorite'],['watchlist','watchlist']])it(`query ${view} exact constraints`,()=>{const h=harness();h.service.subscribeToLibrary({uid:'synthetic-owner',view},()=>{},()=>{});assert.deepEqual(h.listeners[0].target,['users/synthetic-owner/savedMedia',[field,'==',true]])})
  it('guest subscription never calls Firebase',()=>{const h=harness();h.auth.currentUser=null;let error;h.service.subscribeToLibrary({uid:'synthetic-owner',view:'favorites'},()=>assert.fail(),e=>{error=e});assert.equal(error.code,'unauthenticated');assert.deepEqual(h.calls,[]);assert.deepEqual(h.listeners,[])})
  it('logout or UID change blocks stale callback',()=>{const h=harness();let error;h.service.subscribeToSavedMedia({uid:'synthetic-owner',...media},()=>assert.fail(),e=>{error=e});h.auth.currentUser={uid:'other'};h.listeners[0].next(snap(data()));assert.equal(error.code,'session')})
  it('invalid snapshot emits safe error',()=>{const h=harness();let error;h.service.subscribeToSavedMedia({uid:'synthetic-owner',...media},()=>assert.fail(),e=>{error=e});h.listeners[0].next(snap(data({tmdbId:0})));assert.equal(error.code,'invalid-data')})
  it('query does not publish optimistic removals',()=>{const h=harness(),seen=[];h.service.subscribeToLibrary({uid:'synthetic-owner',view:'favorites'},v=>seen.push(v),()=>assert.fail());h.listeners[0].next({docs:[],metadata:{hasPendingWrites:true}});assert.equal(seen.length,0);h.listeners[0].next({docs:[snap(data())],metadata:{}});assert.equal(seen[0].length,1)})
  it('UI controller blocks double action and suppresses post-unmount updates',async()=>{const c=createLibraryAction(),d=deferred(),seen=[];let writes=0;const op=()=>{writes++;return d.promise};const first=c.run(op,x=>seen.push(x));await c.run(op,x=>seen.push(x));assert.equal(writes,1);c.dispose();d.resolve();await first;assert.equal(seen.length,1)})
  it('UI failure stays safe and a subsequent action is explicit',async()=>{const c=createLibraryAction(),seen=[];await c.run(async()=>{throw {code:'unavailable'}},x=>seen.push(x));assert.equal(seen.at(-1).pending,false);assert.equal(seen[1].error.code,'unavailable')})
  for(const error of [{code:'auth/network-request-failed'},{code:'deadline-exceeded'},{code:'malicious',message:'SECRET'},{name:'AbortError'}])it(`maps ${error.code||error.name}`,()=>assert.ok(!toLibraryError(error).message.includes('SECRET')))
})

it('holds query removals even with false pending metadata until transaction settles', async () => {
  const h = harness(data()), d = deferred(), seen = []
  h.service.subscribeToLibrary({ uid: 'synthetic-owner', view: 'favorites' }, value => seen.push(value), () => assert.fail())
  const oldListener = h.listeners[0]
  oldListener.next({ docs: [snap(data())], metadata: {} })
  h.deps.afterCommit = () => d.promise
  const pending = h.service.removeFromView({ uid: 'synthetic-owner', view: 'favorites', media })
  oldListener.next({ docs: [], metadata: { hasPendingWrites: false } })
  assert.equal(seen.length, 1)
  d.resolve(); await pending
  assert.ok(oldListener.stopped)
  oldListener.next({ docs: [], metadata: {} }); assert.equal(seen.length, 1)
  h.listeners.at(-1).next({ docs: [], metadata: { fromCache: true } }); assert.equal(seen.length, 1)
  h.listeners.at(-1).next({ docs: [], metadata: {} }); assert.deepEqual(seen.at(-1), [])
})
