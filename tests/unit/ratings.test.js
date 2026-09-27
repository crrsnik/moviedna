import test from 'node:test'
import assert from 'node:assert/strict'
import { validateScore, validateRatingKey, ratingMediaSnapshot } from '../../src/features/ratings/validation/ratingValidation.js'
import { normalizeRating, normalizeUserRatings } from '../../src/features/ratings/services/normalizeRating.js'
import { createRatingService } from '../../src/features/ratings/services/createRatingService.js'
import { RatingError, toRatingError } from '../../src/features/ratings/services/ratingErrors.js'
import { createLibraryAction } from '../../src/features/library/services/libraryAction.js'
import { savedMediaRoute } from '../../src/features/library/validation/libraryValidation.js'
import { normalizeLibrarySelection, librarySelectionParams } from '../../src/features/library/validation/customListValidation.js'
const time = (seconds = 10, nanoseconds = 0) => ({ seconds, nanoseconds, toMillis: () => seconds * 1000 })
const media = { tmdbId: 42, mediaType: 'movie', title: 'Synthetic movie', posterPath: null, releaseYear: 2020 }
const rating = (patch = {}) => ({ ...media, score: 7, createdAt: time(), updatedAt: time(), ...patch })
const snap = (id, data, metadata = {}) => ({ id, exists: () => data !== undefined, data: () => data, metadata })
function fixture() {
  const uid = 'synthetic-owner', auth = { currentUser: { uid } }, store = new Map([['users/'+uid, { onboardingCompleted: true }]])
  const calls = { paths: [], writes: [], transactions: 0 }, listeners = []
  const controls = { beforeGet: null, afterCallback: null, failure: null }
  const service = createRatingService({ auth, db: {}, serverTimestamp: () => time(20),
    doc: (...args) => { const path = args.slice(1).join('/'); calls.paths.push(path); return { path, id: args.at(-1) } },
    collection: (...args) => { const path = args.slice(1).join('/'); calls.paths.push(path); return { path } },
    onSnapshot: (target, options, next, error) => { const listener = { target, options, next, error, stopped: false }; listeners.push(listener); return () => { listener.stopped = true } },
    runTransaction: async (db, callback) => {
      calls.transactions++
      if (controls.failure) throw controls.failure
      const writes = []
      await callback({
        get: async target => { assert.equal(writes.length, 0); await controls.beforeGet?.(target); return snap(target.id, store.get(target.path)) },
        set: (target, value) => writes.push({ kind: 'set', target, value }),
        update: (target, value) => writes.push({ kind: 'update', target, value }),
        delete: target => writes.push({ kind: 'delete', target }),
      })
      await controls.afterCallback?.()
      for (const write of writes) {
        calls.writes.push(write)
        if (write.kind === 'delete') store.delete(write.target.path)
        else store.set(write.target.path, write.kind === 'set' ? write.value : { ...store.get(write.target.path), ...write.value })
      }
    },
  })
  const path = `users/${uid}/ratings/movie_42`
  return { uid, auth, store, calls, controls, listeners, service, path, seed: (data = rating()) => store.set(path, data) }
}
const reject = (promise, code) => assert.rejects(promise, error => error.code === code && !error.message.includes('PRIVATE'))
for (const score of [1, 10, 5]) test(`valid score ${score}`, () => assert.equal(validateScore(score), score))
for (const score of [0, 11, -1, 1.5, '7', true, null, undefined, NaN, Infinity]) test(`invalid score ${String(score)}`, () => assert.throws(() => validateScore(score), { code: 'invalid-score' }))
for (const key of ['movie_1', 'tv_1396', 'movie_999999999999']) test(`valid rating key ${key}`, () => assert.equal(validateRatingKey(key), key))
for (const key of ['', null, 42, 'movie_0', 'movie_01', 'movie_1.5', 'movie_-1', 'movie_1000000000000', 'movie_1e3', 'person_123', 'tv_42_extra', 'tv_42 ', '../movie_42']) test(`invalid rating key ${String(key)}`, () => assert.throws(() => validateRatingKey(key), { code: 'invalid-media' }))
test('snapshot reuses shared sanitization and strips unknown fields', () => { const input = Object.freeze({ ...media, title: ' Synthetic ', posterPath: 'https://example.invalid/p.jpg', overview: 'Discard', score: 9 }); assert.deepEqual(ratingMediaSnapshot(input), { ...media, title: 'Synthetic' }) })
for (const patch of [{ mediaType: 'person' }, { tmdbId: 0 }, { title: ' ' }]) test(`invalid media snapshot ${JSON.stringify(patch)}`, () => assert.throws(() => ratingMediaSnapshot({ ...media, ...patch }), { code: 'invalid-media' }))
test('normalizes exact rating fields without mutation', () => { const raw = rating(); const result = normalizeRating(snap('movie_42', raw)); assert.equal(result.score, 7); assert.equal(result.key, 'movie_42'); assert.deepEqual(result.updatedAt, { seconds: 10, nanoseconds: 0 }); assert.notEqual(result, raw); assert.equal(typeof raw.createdAt.toMillis, 'function') })
for (const patch of [{ score: 0 }, { score: 11 }, { score: 1.5 }, { score: '7' }, { extra: true }, { title: '' }, { posterPath: 'https://example.invalid/p.jpg' }, { releaseYear: 1799 }, { createdAt: null }, { updatedAt: time(NaN) }, { updatedAt: time(1, -1) }]) test(`corrupted rating ${JSON.stringify(patch)}`, () => assert.throws(() => normalizeRating(snap('movie_42', rating(patch))), { code: 'corrupted-rating' }))
for (const field of Object.keys(rating())) test(`missing rating field ${field}`, () => { const raw = rating(); delete raw[field]; assert.throws(() => normalizeRating(snap('movie_42', raw)), { code: 'corrupted-rating' }) })
test('identity mismatch has a safe domain error', () => assert.throws(() => normalizeRating(snap('tv_42', rating())), { code: 'identity-mismatch' }))
test('collection normalization drops damaged data and sorts updated/created/title/key', () => {
  const documents = [snap('broken', {}), snap('movie_42', rating({ title: 'Z' })), snap('movie_43', rating({ tmdbId: 43, title: 'A' })), snap('movie_44', rating({ tmdbId: 44, createdAt: time(11) })), snap('movie_45', rating({ tmdbId: 45, updatedAt: time(10, 1) })), snap('tv_46', rating({ tmdbId: 46, mediaType: 'tv', updatedAt: time(12) }))]
  assert.deepEqual(normalizeUserRatings({ docs: documents }).map(item => item.key), ['tv_46', 'movie_45', 'movie_44', 'movie_43', 'movie_42'])
  assert.equal(documents.length, 6)
})
for (const type of ['movie', 'tv']) test(`create ${type} rating exact payload and timestamps`, async () => {
  const f = fixture(); await f.service.saveRating(f.uid, { ...media, mediaType: type, unknown: true }, 10)
  const write = f.calls.writes[0]; assert.equal(write.kind, 'set'); assert.deepEqual(Object.keys(write.value).sort(), Object.keys(rating()).sort()); assert.equal(write.value.score, 10); assert.equal(write.value.createdAt.seconds, 20); assert.equal(write.value.updatedAt.seconds, 20); assert.equal(write.target.path, `users/${f.uid}/ratings/${type}_42`)
})
test('update keeps createdAt/identity and refreshes score/snapshot', async () => {
  const f = fixture(); f.seed(); await f.service.saveRating(f.uid, { ...media, title: 'Updated', posterPath: '/new.jpg', releaseYear: 2025 }, 1)
  const write = f.calls.writes[0]; assert.equal(write.kind, 'update'); assert.deepEqual(Object.keys(write.value).sort(), ['posterPath','releaseYear','score','title','updatedAt']); assert.equal(f.store.get(f.path).createdAt.seconds, 10); assert.equal(f.store.get(f.path).title, 'Updated'); assert.equal(f.store.get(f.path).score, 1)
})
test('transaction rejects corrupt identity', async () => { const f = fixture(); f.seed(rating({ mediaType: 'tv' })); await reject(f.service.saveRating(f.uid, media, 4), 'identity-mismatch'); assert.equal(f.calls.writes.length, 0) })
test('transaction rejects corrupted score', async () => { const f = fixture(); f.seed(rating({ score: '8' })); await reject(f.service.saveRating(f.uid, media, 4), 'corrupted-rating'); assert.equal(f.calls.writes.length, 0) })
for (const state of ['missing', false, 'true']) test(`save requires completed profile ${state}`, async () => { const f = fixture(); if (state === 'missing') f.store.delete(`users/${f.uid}`); else f.store.set(`users/${f.uid}`, { onboardingCompleted: state }); await reject(f.service.saveRating(f.uid, media, 8), 'incomplete-profile'); assert.equal(f.calls.writes.length, 0) })
test('delete confirmation, missing delete idempotent, savedMedia untouched', async () => { const f = fixture(); f.seed(); const preserved = Object.freeze({ favorite: true, watchlist: true, listIds: ['synthetic-list'] }); f.store.set(`users/${f.uid}/savedMedia/movie_42`, preserved); await f.service.deleteRating(f.uid, 'movie_42'); await f.service.deleteRating(f.uid, 'movie_42'); assert.equal(f.calls.writes.length, 1); assert.equal(f.store.get(`users/${f.uid}/savedMedia/movie_42`), preserved); assert.ok(f.calls.paths.every(path => !path.includes('savedMedia'))) })
for (const operation of [f => f.service.saveRating(f.uid, media, 0), f => f.service.saveRating(f.uid, { ...media, mediaType: 'person' }, 5), f => f.service.deleteRating(f.uid, 'movie_01')]) test(`invalid before Firestore ${operation}`, async () => { const f = fixture(); await assert.rejects(operation(f)); assert.equal(f.calls.paths.length, 0); assert.equal(f.calls.transactions, 0) })
for (const uid of [null, '', 'other-user', 'user/path']) for (const method of ['save', 'delete']) test(`${method} rejects non-owner ${String(uid)}`, async () => { const f = fixture(); await reject(method === 'save' ? f.service.saveRating(uid, media, 6) : f.service.deleteRating(uid, 'movie_42'), 'unauthenticated'); assert.equal(f.calls.paths.length, 0) })
test('unauthenticated before any reads', async () => { const f = fixture(); f.auth.currentUser = null; await reject(f.service.saveRating(f.uid, media, 6), 'unauthenticated'); assert.equal(f.calls.paths.length, 0) })
for (const nextSession of [null, { uid: 'another-user' }, { uid: 'synthetic-owner' }]) test(`session change during transaction read ${JSON.stringify(nextSession)}`, async () => { const f = fixture(); f.controls.beforeGet = () => { f.auth.currentUser = nextSession }; await reject(f.service.saveRating(f.uid, media, 6), 'session'); assert.equal(f.calls.writes.length, 0) })
test('logout after dispatched commit cannot undo write but suppresses success', async () => { const f = fixture(); f.controls.afterCallback = () => { f.auth.currentUser = null }; await reject(f.service.saveRating(f.uid, media, 6), 'session'); assert.equal(f.store.get(f.path).score, 6) })
test('service lock rejects double save/delete until confirmation', async () => { const f = fixture(); let release; f.controls.afterCallback = () => new Promise(resolve => { release = resolve }); const pending = f.service.saveRating(f.uid, media, 7); while (!release) await Promise.resolve(); await reject(f.service.saveRating(f.uid, media, 8), 'pending'); await reject(f.service.deleteRating(f.uid, 'movie_42'), 'pending'); assert.equal(f.calls.transactions, 1); release(); await pending })
test('failed write is not auto-retried', async () => { const f = fixture(); f.controls.failure = { code: 'unavailable', message: 'PRIVATE' }; await reject(f.service.saveRating(f.uid, media, 8), 'unavailable'); assert.equal(f.calls.transactions, 1) })
test('direct subscription normalizes and can return absent rating', () => { const f = fixture(), values = []; const stop = f.service.subscribeToRating(f.uid, 'movie_42', value => values.push(value), assert.fail); const l = f.listeners[0]; assert.equal(l.target.path, f.path); assert.deepEqual(l.options, { includeMetadataChanges: true }); l.next(snap('movie_42')); l.next(snap('movie_42', rating())); assert.equal(values[0], null); assert.equal(values[1].score, 7); stop() })
test('direct corrupt snapshot safely errors', () => { const f = fixture(), errors = []; f.service.subscribeToRating(f.uid, 'movie_42', assert.fail, e => errors.push(e)); f.listeners[0].next(snap('movie_42', { bad: true })); assert.equal(errors[0].code, 'corrupted-rating') })
test('ratings collection is owner scoped without query/orderBy', () => { const f = fixture(), values = []; const stop = f.service.subscribeToUserRatings(f.uid, v => values.push(v), assert.fail); assert.equal(f.listeners[0].target.path, `users/${f.uid}/ratings`); f.listeners[0].next({ docs: [snap('movie_42', rating()), snap('invalid', {})] }); assert.equal(values[0].length, 1); stop() })
test('invalid subscription key/owner does not reach Firebase', () => { const f = fixture(), errors = []; f.service.subscribeToRating(f.uid, 'bad', assert.fail, e => errors.push(e.code)); f.service.subscribeToUserRatings('other-user', assert.fail, e => errors.push(e.code)); assert.deepEqual(errors, ['invalid-media','unauthenticated']); assert.equal(f.calls.paths.length, 0) })
test('unsubscribe ignores stale success/error callbacks', () => { const f = fixture(); const stop = f.service.subscribeToRating(f.uid, 'movie_42', assert.fail, assert.fail); const l = f.listeners[0]; stop(); l.next(snap('movie_42', rating())); l.error({ code: 'unavailable' }); assert.equal(l.stopped, true) })
test('cache and pending snapshots ignored; session change reported', () => { const f = fixture(), errors = []; f.service.subscribeToRating(f.uid, 'movie_42', assert.fail, e => errors.push(e.code)); const l = f.listeners[0]; l.next(snap('movie_42', rating(), { fromCache: true })); l.next(snap('movie_42', rating(), { hasPendingWrites: true })); f.auth.currentUser = null; l.next(snap('movie_42', rating())); assert.deepEqual(errors, ['session']) })
test('pending query removal is hidden until confirmation; old generation ignored', async () => {
  const f = fixture(), values = []; f.seed(); const stop = f.service.subscribeToUserRatings(f.uid, v => values.push(v), assert.fail)
  const old = f.listeners[0]; let release; f.controls.afterCallback = () => new Promise(resolve => { release = resolve }); const pending = f.service.deleteRating(f.uid, 'movie_42'); while (!release) await Promise.resolve()
  old.next({ docs: [], metadata: { hasPendingWrites: false } }); assert.equal(values.length, 0); release(); await pending
  old.next({ docs: [snap('movie_42', rating())] }); assert.equal(values.length, 0)
  f.listeners.at(-1).next({ docs: [] }); assert.deepEqual(values, [[]]); assert.equal(old.stopped, true); stop()
})
test('UI action controller blocks double-submit and stale success', async () => { const c = createLibraryAction(); let release, count = 0, success = 0; const op = () => { count++; return new Promise(r => { release = r }) }; const pending = c.run(op, () => {}, () => success++); await c.run(op, () => {}); assert.equal(count, 1); c.dispose(); release(); await pending; assert.equal(success, 0) })
for (const [raw, expected] of [['firestore/permission-denied','permission-denied'],['unavailable','unavailable'],['deadline-exceeded','network'],['auth/network-request-failed','network'],['cancelled','aborted'],['unexpected-secret','unknown']]) test(`safe mapping ${raw}`, () => { const e = toRatingError({ code: raw, message: 'PRIVATE' }); assert.equal(e.code, expected); assert.ok(!e.message.includes('PRIVATE')); assert.notEqual(e.message, raw) })
for (const code of ['incomplete-profile','invalid-score','invalid-media','corrupted-rating','identity-mismatch','session','pending']) test(`safe domain error ${code}`, () => { const error = new RatingError(code); assert.equal(toRatingError(error), error); assert.ok(error.message.length > 10) })
for (const type of ['movie','tv']) test(`rating route ${type}`, () => assert.equal(savedMediaRoute({ ...media, mediaType: type }), `/${type === 'movie' ? 'movies' : 'tv'}/42`))
test('ratings library URL canonical; other views preserved', () => { for (const view of ['ratings','favorites','watchlist']) assert.equal(librarySelectionParams(normalizeLibrarySelection(new URLSearchParams({ view, extra: 'ignored' }))).toString(), `view=${view}`); const params = new URLSearchParams({ view: 'list', listId: 'A'.repeat(20) }); assert.equal(librarySelectionParams(normalizeLibrarySelection(params)).toString(), params.toString()) })
