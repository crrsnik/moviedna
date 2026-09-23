import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection, collectionGroup, deleteDoc, deleteField, doc, getDoc, getDocs, serverTimestamp,
  setDoc, Timestamp, updateDoc, writeBatch, query, where,
} from 'firebase/firestore'

// Refuse direct runs or remote endpoints. Never import the app's Firebase config.
const projectId = 'demo-moviedna'
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST
if (!['127.0.0.1:8080', 'localhost:8080'].includes(emulatorHost)
    || process.env.GCLOUD_PROJECT !== projectId) {
  throw new Error('Run npm run test:rules with the local demo-moviedna Firestore Emulator')
}

let testEnv
const profile = (username = 'alice_123', overrides = {}) => ({
  username,
  displayName: 'Alice',
  photoURL: null,
  bio: '',
  onboardingCompleted: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
})
const reservation = (userId = 'alice', overrides = {}) => ({
  userId, createdAt: serverTimestamp(), ...overrides,
})
const userDb = (uid = 'alice') => testEnv.authenticatedContext(uid).firestore()

function createPair(db, {
  uid = 'alice', username = 'alice_123', profileData = profile(username),
  reservationData = reservation(uid),
} = {}) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', uid), profileData)
  batch.set(doc(db, 'usernames', username), reservationData)
  return batch.commit()
}

async function seedPair() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await createPair(context.firestore())
  })
}

// Sequential tests keep clearFirestore isolated from other test cases.
describe('Initial profile security rules', { concurrency: false }, () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: '127.0.0.1', port: 8080,
        rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
      },
    })
  })
  beforeEach(async () => { await testEnv.clearFirestore() })
  after(async () => { await testEnv?.cleanup() })

  it('denies unauthenticated profile creation', async () => {
    await assertFails(createPair(testEnv.unauthenticatedContext().firestore()))
  })
  it('denies creating another UID profile', async () => {
    await assertFails(createPair(userDb('bob')))
  })
  it('allows an atomic profile/reservation pair with server timestamps', async () => {
    const db = userDb()
    await assertSucceeds(createPair(db))
    const user = (await getDoc(doc(db, 'users', 'alice'))).data()
    const name = (await getDoc(doc(db, 'usernames', 'alice_123'))).data()
    assert.equal(user.username, 'alice_123')
    assert.equal(name.userId, 'alice')
    assert.ok(user.createdAt instanceof Timestamp)
    assert.ok(user.createdAt.isEqual(user.updatedAt))
    assert.ok(user.createdAt.isEqual(name.createdAt))
  })
  it('denies a profile without its reservation', async () => {
    const db = userDb()
    await assertFails(setDoc(doc(db, 'users', 'alice'), profile()))
  })
  it('denies a reservation without its profile', async () => {
    const db = userDb()
    await assertFails(setDoc(doc(db, 'usernames', 'alice_123'), reservation()))
  })
  it('denies two users claiming the same username and rolls back the losing batch', async () => {
    await assertSucceeds(createPair(userDb()))
    const db = userDb('bob')
    await assertFails(createPair(db, { uid: 'bob' }))
    assert.equal((await getDoc(doc(db, 'users', 'bob'))).exists(), false)
    assert.equal((await getDoc(doc(db, 'usernames', 'alice_123'))).data().userId, 'alice')
  })

  for (const username of ['Alice', 'ab', 'a'.repeat(21), 'a b', 'a-b', 'a@b', 'кино']) {
    it(`denies invalid username ${JSON.stringify(username)}`, async () => {
      await assertFails(createPair(userDb(), { username }))
    })
  }
  for (const username of ['a_1', 'a'.repeat(20)]) {
    it(`allows username boundary length ${username.length}`, async () => {
      await assertSucceeds(createPair(userDb(), { username }))
    })
  }
  it('denies a non-string profile username', async () => {
    await assertFails(createPair(userDb(), { profileData: profile(123) }))
  })
  for (const displayName of ['', 'a'.repeat(51), 42, null]) {
    it(`denies invalid displayName ${JSON.stringify(displayName)}`, async () => {
      await assertFails(createPair(userDb(), { profileData: profile(undefined, { displayName }) }))
    })
  }
  for (const displayName of ['A', 'A'.repeat(50)]) {
    it(`allows displayName boundary length ${displayName.length}`, async () => {
      await assertSucceeds(createPair(userDb(), { profileData: profile(undefined, { displayName }) }))
    })
  }
  for (const extra of [{ role: 'admin' }, { email: 'test@example.invalid' }]) {
    it(`denies extra profile field ${Object.keys(extra)[0]}`, async () => {
      await assertFails(createPair(userDb(), { profileData: profile(undefined, extra) }))
    })
  }
  for (const field of Object.keys(profile())) {
    it(`denies missing profile field ${field}`, async () => {
      const data = profile()
      delete data[field]
      await assertFails(createPair(userDb(), { profileData: data }))
    })
  }
  for (const overrides of [
    { bio: 'hello' }, { bio: null }, { photoURL: '' },
    { onboardingCompleted: true }, { onboardingCompleted: 0 },
    { createdAt: Timestamp.fromMillis(0) }, { updatedAt: Timestamp.fromMillis(0) },
  ]) {
    it(`denies invalid initial profile ${JSON.stringify(overrides)}`, async () => {
      await assertFails(createPair(userDb(), { profileData: profile(undefined, overrides) }))
    })
  }
  for (const overrides of [
    { userId: 'bob' }, { userId: 42 }, { extra: true },
    { createdAt: Timestamp.fromMillis(0) },
  ]) {
    it(`denies invalid reservation ${JSON.stringify(overrides)}`, async () => {
      await assertFails(createPair(userDb(), { reservationData: reservation('alice', overrides) }))
    })
  }
  for (const field of ['userId', 'createdAt']) {
    it(`denies reservation missing ${field}`, async () => {
      const data = reservation()
      delete data[field]
      await assertFails(createPair(userDb(), { reservationData: data }))
    })
  }
  it('denies mismatched profile and reservation usernames', async () => {
    await assertFails(createPair(userDb(), { profileData: profile('another_name') }))
  })
  it('denies creating a profile against a pre-existing reservation', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'usernames', 'alice_123'), reservation())
    })
    const db = userDb()
    await assertFails(setDoc(doc(db, 'users', 'alice'), profile()))
  })
  it('denies creating a reservation against a pre-existing profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'users', 'alice'), profile())
    })
    const db = userDb()
    await assertFails(setDoc(doc(db, 'usernames', 'alice_123'), reservation()))
  })

  it('allows owner to get their profile', async () => {
    await seedPair()
    await assertSucceeds(getDoc(doc(userDb(), 'users', 'alice')))
  })
  it('denies another user reading a profile', async () => {
    await seedPair()
    await assertFails(getDoc(doc(userDb('bob'), 'users', 'alice')))
  })
  for (const path of ['users', 'usernames']) {
    it(`denies unauthenticated get in ${path}`, async () => {
      await seedPair()
      const db = testEnv.unauthenticatedContext().firestore()
      await assertFails(getDoc(doc(db, path, path === 'users' ? 'alice' : 'alice_123')))
    })
    it(`denies list in ${path}`, async () => {
      await seedPair()
      await assertFails(getDocs(collection(userDb(), path)))
    })
    it(`denies update in ${path}`, async () => {
      await seedPair()
      const db = userDb()
      const ref = doc(db, path, path === 'users' ? 'alice' : 'alice_123')
      await assertFails(updateDoc(ref, { createdAt: serverTimestamp() }))
    })
    it(`denies delete in ${path}`, async () => {
      await seedPair()
      const db = userDb()
      await assertFails(deleteDoc(doc(db, path, path === 'users' ? 'alice' : 'alice_123')))
    })
  }
  it('allows authenticated get of a concrete username belonging to someone else', async () => {
    await seedPair()
    await assertSucceeds(getDoc(doc(userDb('bob'), 'usernames', 'alice_123')))
  })
  it('allows authenticated check of an available username', async () => {
    const snapshot = await assertSucceeds(getDoc(doc(userDb(), 'usernames', 'available')))
    assert.equal(snapshot.exists(), false)
  })
  it('denies unauthenticated reservation creation', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, 'usernames', 'alice_123'), reservation()))
  })
  for (const path of ['reviews/review1', 'users/alice/private/data', 'usernames/alice_123/private/data']) {
    it(`denies writes and reads outside allowed documents: ${path}`, async () => {
      const ref = doc(userDb(), path)
      await assertFails(setDoc(ref, { text: 'test' }))
      await assertFails(getDoc(ref))
    })
  }
})

const responseData = (overrides = {}) => ({
  tmdbId: 123, mediaType: 'movie', reaction: 'like', genreIds: [18],
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides,
})
const summaryData = (overrides = {}) => ({
  version: 1, userId: 'alice', status: 'completed', responseCount: 10,
  likedCount: 5, dislikedCount: 3, skippedCount: 2,
  completedAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides,
})
const responseRef = (db, uid = 'alice', id = '123') => doc(db, 'users', uid, 'onboardingResponses', id)
const summaryRef = (db, uid = 'alice', id = 'summary') => doc(db, 'users', uid, 'onboarding', id)
const completionPatch = () => ({ onboardingCompleted: true, updatedAt: serverTimestamp() })

function completeOnboarding(db, { uid = 'alice', id = 'summary', summary = summaryData(), patch = completionPatch() } = {}) {
  const batch = writeBatch(db)
  batch.set(summaryRef(db, uid, id), summary)
  batch.update(doc(db, 'users', uid), patch)
  return batch.commit()
}

// This suite has its own lifecycle; the original 63 regression tests remain intact.
describe('Onboarding security rules', { concurrency: false }, () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
    })
  })
  beforeEach(async () => { await testEnv.clearFirestore(); await seedPair() })
  after(async () => { await testEnv?.cleanup() })

  describe('Responses: ownership and lifecycle', () => {
    for (const reaction of ['like', 'dislike', 'skip']) {
      it(`allows owner create ${reaction} and get`, async () => {
        const ref = responseRef(userDb())
        await assertSucceeds(setDoc(ref, responseData({ reaction })))
        const saved = (await assertSucceeds(getDoc(ref))).data()
        assert.equal(saved.reaction, reaction)
        assert.ok(saved.createdAt instanceof Timestamp)
        assert.ok(saved.createdAt.isEqual(saved.updatedAt))
      })
    }
    it('allows owner list and reading after completion', async () => {
      const db = userDb()
      await setDoc(responseRef(db), responseData())
      assert.equal((await assertSucceeds(getDocs(collection(db, 'users/alice/onboardingResponses')))).size, 1)
      await completeOnboarding(db)
      await assertSucceeds(getDoc(responseRef(db)))
      assert.equal((await assertSucceeds(getDocs(collection(db, 'users/alice/onboardingResponses')))).size, 1)
    })
    for (const identity of ['guest', 'bob']) {
      for (const operation of ['get', 'list', 'create', 'update', 'delete']) {
        it(`denies ${identity} response ${operation}`, async () => {
          await setDoc(responseRef(userDb()), responseData())
          const db = identity === 'guest' ? testEnv.unauthenticatedContext().firestore() : userDb('bob')
          const ref = responseRef(db)
          const actions = {
            get: () => getDoc(ref),
            list: () => getDocs(collection(db, 'users/alice/onboardingResponses')),
            create: () => setDoc(responseRef(db, 'alice', '124'), responseData({ tmdbId: 124 })),
            update: () => updateDoc(ref, { reaction: 'skip', updatedAt: serverTimestamp() }),
            delete: () => deleteDoc(ref),
          }
          await assertFails(actions[operation]())
        })
      }
    }
    it('denies cross-owner collection-group queries', async () => {
      await setDoc(responseRef(userDb()), responseData())
      await assertFails(getDocs(collectionGroup(userDb(), 'onboardingResponses')))
    })
    it('denies creating response without existing own profile', async () => {
      await assertFails(setDoc(responseRef(userDb('bob'), 'bob'), responseData()))
    })
    it('denies response in same batch as initial profile creation', async () => {
      const db = userDb('bob'), batch = writeBatch(db)
      batch.set(doc(db, 'users/bob'), profile('bob_123'))
      batch.set(doc(db, 'usernames/bob_123'), reservation('bob'))
      batch.set(responseRef(db, 'bob'), responseData())
      await assertFails(batch.commit())
    })
    it('allows reaction and genres updates while preserving immutable fields', async () => {
      const ref = responseRef(userDb())
      await setDoc(ref, responseData())
      const before = (await getDoc(ref)).data()
      await assertSucceeds(updateDoc(ref, { reaction: 'dislike', updatedAt: serverTimestamp() }))
      await assertSucceeds(updateDoc(ref, { genreIds: [35, 18], updatedAt: serverTimestamp() }))
      const after = (await getDoc(ref)).data()
      assert.equal(after.tmdbId, before.tmdbId)
      assert.equal(after.mediaType, before.mediaType)
      assert.ok(after.createdAt.isEqual(before.createdAt))
      assert.equal(after.reaction, 'dislike')
      assert.deepEqual(after.genreIds, [35, 18])
    })
    for (const operation of ['create', 'update', 'delete']) {
      it(`denies owner response ${operation} after completion`, async () => {
        const db = userDb()
        await setDoc(responseRef(db), responseData())
        await completeOnboarding(db)
        const actions = {
          create: () => setDoc(responseRef(db, 'alice', '124'), responseData({ tmdbId: 124 })),
          update: () => updateDoc(responseRef(db), { reaction: 'skip', updatedAt: serverTimestamp() }),
          delete: () => deleteDoc(responseRef(db)),
        }
        await assertFails(actions[operation]())
      })
    }
    it('denies owner delete before completion', async () => {
      const ref = responseRef(userDb())
      await setDoc(ref, responseData())
      await assertFails(deleteDoc(ref))
    })
  })

  describe('Responses: exact schema and immutable fields', () => {
    for (const id of ['0', '01', '-1', '1.2', 'abc', '1234567890123', '1e2']) {
      it(`denies invalid response ID ${id}`, async () => {
        await assertFails(setDoc(responseRef(userDb(), 'alice', id), responseData()))
      })
    }
    for (const id of ['1', '999999999999']) {
      it(`allows response ID boundary ${id}`, async () => {
        await assertSucceeds(setDoc(responseRef(userDb(), 'alice', id), responseData({ tmdbId: Number(id) })))
      })
    }
    it('denies numeric document ID mismatching tmdbId', async () => {
      await assertFails(setDoc(responseRef(userDb(), 'alice', '124'), responseData()))
    })
    for (const field of Object.keys(responseData())) {
      it(`denies missing response field ${field}`, async () => {
        const data = responseData(); delete data[field]
        await assertFails(setDoc(responseRef(userDb()), data))
      })
      it(`denies removal of response field ${field} on update`, async () => {
        const ref = responseRef(userDb())
        await setDoc(ref, responseData())
        await assertFails(updateDoc(ref, { updatedAt: serverTimestamp(), [field]: deleteField() }))
      })
    }
    const invalid = [
      ['tmdbId string', { tmdbId: '123' }], ['tmdbId zero', { tmdbId: 0 }],
      ['tmdbId negative', { tmdbId: -1 }], ['tmdbId fractional', { tmdbId: 123.5 }],
      ['TV media', { mediaType: 'tv' }], ['invalid reaction', { reaction: 'love' }],
      ['non-string reaction', { reaction: 1 }], ['genres not list', { genreIds: {} }],
      ['too many genres', { genreIds: Array(11).fill(18) }],
      ['createdAt client timestamp', { createdAt: Timestamp.fromMillis(0) }],
      ['updatedAt client timestamp', { updatedAt: Timestamp.fromMillis(0) }],
      ['title field', { title: 'Synthetic title' }], ['overview field', { overview: 'Synthetic' }],
      ['poster field', { posterPath: '/synthetic.jpg' }], ['rating field', { voteAverage: 7 }],
    ]
    for (const [name, overrides] of invalid) {
      it(`denies create with ${name}`, async () => {
        await assertFails(setDoc(responseRef(userDb()), responseData(overrides)))
      })
      it(`denies update with ${name}`, async () => {
        const ref = responseRef(userDb())
        await setDoc(ref, responseData())
        await assertFails(updateDoc(ref, { updatedAt: serverTimestamp(), ...overrides }))
      })
    }
    it('denies changing tmdbId to another valid integer', async () => {
      const ref = responseRef(userDb())
      await setDoc(ref, responseData())
      await assertFails(updateDoc(ref, { tmdbId: 124, updatedAt: serverTimestamp() }))
    })
    it('denies refreshing createdAt even with a server timestamp', async () => {
      const ref = responseRef(userDb())
      await setDoc(ref, responseData())
      await assertFails(updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
    })
    it('denies response update without refreshing updatedAt', async () => {
      const ref = responseRef(userDb())
      await setDoc(ref, responseData())
      await assertFails(updateDoc(ref, { reaction: 'skip' }))
    })
    for (const genreIds of [[], Array.from({ length: 10 }, (_, i) => i + 1)]) {
      it(`allows genre list length ${genreIds.length}`, async () => {
        await assertSucceeds(setDoc(responseRef(userDb()), responseData({ genreIds })))
      })
    }
    it('documents that Rules check genre list shape, not individual element types', async () => {
      await assertSucceeds(setDoc(responseRef(userDb()), responseData({ genreIds: ['not-an-integer', null] })))
    })
  })

  describe('Summary and atomic completion', () => {
    for (const count of [10, 30]) {
      it(`allows atomic completion at count boundary ${count}`, async () => {
        const db = userDb()
        await assertSucceeds(completeOnboarding(db, { summary: summaryData({ responseCount: count, likedCount: count, dislikedCount: 0, skippedCount: 0 }) }))
        const saved = (await assertSucceeds(getDoc(summaryRef(db)))).data()
        const user = (await getDoc(doc(db, 'users/alice'))).data()
        assert.equal(user.onboardingCompleted, true)
        assert.equal(saved.responseCount, count)
        assert.ok(saved.completedAt.isEqual(saved.updatedAt))
        assert.ok(saved.completedAt.isEqual(user.updatedAt))
      })
    }
    it('allows final responses in the same atomic completion batch', async () => {
      const db = userDb(), batch = writeBatch(db)
      for (let id = 1; id <= 30; id++) batch.set(responseRef(db, 'alice', String(id)), responseData({ tmdbId: id }))
      batch.set(summaryRef(db), summaryData({ responseCount: 30, likedCount: 30, dislikedCount: 0, skippedCount: 0 }))
      batch.update(doc(db, 'users/alice'), completionPatch())
      await assertSucceeds(batch.commit())
      assert.equal((await getDocs(collection(db, 'users/alice/onboardingResponses'))).size, 30)
    })
    it('documents that summary counts do not prove actual response count', async () => {
      const db = userDb()
      await assertSucceeds(completeOnboarding(db))
      assert.equal((await getDocs(collection(db, 'users/alice/onboardingResponses'))).size, 0)
    })
    it('denies standalone summary', async () => {
      await assertFails(setDoc(summaryRef(userDb()), summaryData()))
    })
    it('denies standalone profile completion', async () => {
      await assertFails(updateDoc(doc(userDb(), 'users/alice'), completionPatch()))
    })
    for (const identity of ['guest', 'bob']) {
      it(`denies ${identity} completing another profile`, async () => {
        const db = identity === 'guest' ? testEnv.unauthenticatedContext().firestore() : userDb('bob')
        await assertFails(completeOnboarding(db))
      })
      it(`denies ${identity} reading summary`, async () => {
        await completeOnboarding(userDb())
        const db = identity === 'guest' ? testEnv.unauthenticatedContext().firestore() : userDb('bob')
        await assertFails(getDoc(summaryRef(db)))
      })
    }
    it('denies summary under an unexpected document ID and leaves profile unchanged', async () => {
      await assertFails(completeOnboarding(userDb(), { id: 'other' }))
      assert.equal((await getDoc(doc(userDb(), 'users/alice'))).data().onboardingCompleted, false)
    })
    it('denies summary without existing profile', async () => {
      await assertFails(setDoc(summaryRef(userDb('bob'), 'bob'), summaryData({ userId: 'bob' })))
    })
    it('denies reuse of an existing summary even when timestamps are refreshed', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(summaryRef(context.firestore()), summaryData())
      })
      await assertFails(updateDoc(doc(userDb(), 'users/alice'), completionPatch()))
      await assertFails(completeOnboarding(userDb()))
    })
    it('denies completion referencing another owner summary', async () => {
      await createPair(userDb('bob'), { uid: 'bob', username: 'bob_123', reservationData: reservation('bob') })
      await completeOnboarding(userDb('bob'), { uid: 'bob', summary: summaryData({ userId: 'bob' }) })
      await assertFails(updateDoc(doc(userDb(), 'users/alice'), completionPatch()))
      const db = userDb(), batch = writeBatch(db)
      batch.update(doc(db, 'users/alice'), completionPatch())
      batch.set(summaryRef(db, 'bob'), summaryData({ userId: 'bob' }))
      await assertFails(batch.commit())
    })
    for (const field of Object.keys(summaryData())) {
      it(`denies missing summary field ${field}`, async () => {
        const data = summaryData(); delete data[field]
        await assertFails(completeOnboarding(userDb(), { summary: data }))
      })
    }
    const invalid = [
      ['extra field', { extra: true }], ['wrong version', { version: 2 }],
      ['string version', { version: '1' }], ['wrong userId', { userId: 'bob' }],
      ['wrong status', { status: 'pending' }],
      ['count below minimum', { responseCount: 9, likedCount: 4 }],
      ['count above maximum', { responseCount: 31, likedCount: 26 }],
      ['count sum mismatch', { likedCount: 6 }],
      ['bad completedAt', { completedAt: Timestamp.fromMillis(0) }],
      ['bad updatedAt', { updatedAt: Timestamp.fromMillis(0) }],
    ]
    for (const [name, overrides] of invalid) {
      it(`denies summary ${name}`, async () => {
        const db = userDb()
        await assertFails(completeOnboarding(db, { summary: summaryData(overrides) }))
        assert.equal((await getDoc(doc(db, 'users/alice'))).data().onboardingCompleted, false)
        assert.equal((await getDoc(summaryRef(db))).exists(), false)
      })
    }
    for (const field of ['responseCount', 'likedCount', 'dislikedCount', 'skippedCount']) {
      for (const value of [-1, 1.5, '10']) {
        it(`denies ${field} = ${JSON.stringify(value)}`, async () => {
          await assertFails(completeOnboarding(userDb(), { summary: summaryData({ [field]: value }) }))
        })
      }
    }
    for (const field of ['likedCount', 'dislikedCount', 'skippedCount']) {
      it(`denies negative ${field} even when sum equals responseCount`, async () => {
        const counts = { likedCount: 0, dislikedCount: 0, skippedCount: 0, [field]: -1 }
        counts[field === 'likedCount' ? 'dislikedCount' : 'likedCount'] = 11
        await assertFails(completeOnboarding(userDb(), { summary: summaryData(counts) }))
      })
    }
    for (const [field, value] of Object.entries({ username: 'changed_123', displayName: 'Changed', bio: 'Changed', photoURL: 'https://example.invalid/photo', createdAt: Timestamp.fromMillis(0), extra: true })) {
      it(`denies modifying profile ${field} during completion`, async () => {
        await assertFails(completeOnboarding(userDb(), { patch: { ...completionPatch(), [field]: value } }))
      })
    }
    it('denies deleting a profile field during completion', async () => {
      await assertFails(completeOnboarding(userDb(), { patch: { ...completionPatch(), bio: deleteField() } }))
    })
    it('denies completion with stale profile updatedAt', async () => {
      await assertFails(completeOnboarding(userDb(), { patch: { onboardingCompleted: true } }))
      await assertFails(completeOnboarding(userDb(), { patch: { onboardingCompleted: true, updatedAt: Timestamp.fromMillis(0) } }))
    })
    it('denies false to false completion', async () => {
      await assertFails(completeOnboarding(userDb(), { patch: { onboardingCompleted: false, updatedAt: serverTimestamp() } }))
    })
    it('denies true to false and repeated completion', async () => {
      const db = userDb()
      await completeOnboarding(db)
      await assertFails(updateDoc(doc(db, 'users/alice'), { onboardingCompleted: false, updatedAt: serverTimestamp() }))
      await assertFails(updateDoc(doc(db, 'users/alice'), completionPatch()))
      await assertFails(completeOnboarding(db))
    })
    for (const operation of ['update', 'delete', 'list']) {
      it(`denies owner summary ${operation}`, async () => {
        const db = userDb()
        await completeOnboarding(db)
        const actions = {
          update: () => updateDoc(summaryRef(db), { updatedAt: serverTimestamp() }),
          delete: () => deleteDoc(summaryRef(db)),
          list: () => getDocs(collection(db, 'users/alice/onboarding')),
        }
        await assertFails(actions[operation]())
      })
    }
    for (const path of ['users/alice/onboarding/other', 'users/alice/onboarding/summary/private/data', 'users/alice/onboardingResponses/123/private/data', 'users/alice/preferences/data']) {
      it(`keeps unknown onboarding paths denied: ${path}`, async () => {
        await assertFails(getDoc(doc(userDb(), path)))
        await assertFails(setDoc(doc(userDb(), path), { data: 'synthetic' }))
      })
    }
  })
})

// Stage 7.1: isolated demo-only library suite. Earlier 208 cases are unchanged.
const listId = 'AbCdEf0123456789GhIj'
const libraryList = (patch = {}) => ({ name: 'Synthetic list', description: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...patch })
const savedMedia = (patch = {}) => ({ tmdbId: 123, mediaType: 'movie', title: 'Synthetic movie', posterPath: null, releaseYear: null, favorite: true, watchlist: false, listIds: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...patch })

describe('Media library security rules', { concurrency: false }, () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } })
  })
  beforeEach(async () => { await testEnv.clearFirestore() })
  after(async () => { await testEnv?.cleanup() })

  for (const [collectionName, id, make] of [['lists', listId, libraryList], ['savedMedia', 'movie_123', savedMedia]]) {
    const ref = (db, key = id) => doc(db, 'users', 'alice', collectionName, key)
    it(`${collectionName}: owner lifecycle, timestamps and no profile prerequisite`, async () => {
      const db = userDb(), target = ref(db)
      await assertSucceeds(setDoc(target, make()))
      const initial = (await assertSucceeds(getDoc(target))).data()
      assert.ok(initial.createdAt instanceof Timestamp)
      assert.ok(initial.createdAt.isEqual(initial.updatedAt))
      assert.equal((await assertSucceeds(getDocs(collection(db, 'users/alice/' + collectionName)))).size, 1)
      await assertSucceeds(updateDoc(target, { ...(collectionName === 'lists' ? { name: 'Renamed', description: 'Description' } : { favorite: false, watchlist: true, title: 'Updated', posterPath: '/poster.jpg', releaseYear: 2020 }), updatedAt: serverTimestamp() }))
      assert.ok((await getDoc(target)).data().createdAt.isEqual(initial.createdAt))
      await assertSucceeds(deleteDoc(target))
    })
    for (const identity of ['guest', 'bob']) for (const operation of ['get', 'list', 'create', 'update', 'delete']) {
      it(`${collectionName}: denies ${identity} ${operation}`, async () => {
        if (operation !== 'create') await setDoc(ref(userDb()), make())
        const db = identity === 'guest' ? testEnv.unauthenticatedContext().firestore() : userDb('bob')
        const actions = { get: () => getDoc(ref(db)), list: () => getDocs(collection(db, 'users/alice/' + collectionName)), create: () => setDoc(ref(db), make()), update: () => updateDoc(ref(db), { updatedAt: serverTimestamp() }), delete: () => deleteDoc(ref(db)) }
        await assertFails(actions[operation]())
      })
    }
    it(`${collectionName}: denies cross-user collection group`, async () => {
      await setDoc(ref(userDb()), make())
      await testEnv.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), 'users', 'bob', collectionName, id), make()))
      await assertFails(getDocs(collectionGroup(userDb(), collectionName)))
    })
    for (const field of Object.keys(make())) for (const action of ['create', 'update']) {
      it(`${collectionName}: denies ${action} missing ${field}`, async () => {
        const target = ref(userDb())
        if (action === 'create') { const data = make(); delete data[field]; await assertFails(setDoc(target, data)) }
        else { await setDoc(target, make()); await assertFails(updateDoc(target, { [field]: deleteField(), ...(field === 'updatedAt' ? {} : { updatedAt: serverTimestamp() }) })) }
      })
    }
    for (const patch of [{ extra: true }, { createdAt: Timestamp.fromMillis(0) }, { updatedAt: Timestamp.fromMillis(0) }, { createdAt: 'bad' }, { updatedAt: null }]) {
      for (const action of ['create', 'update']) it(`${collectionName}: denies ${action} ${JSON.stringify(patch)}`, async () => {
        const target = ref(userDb())
        if (action === 'create') await assertFails(setDoc(target, make(patch)))
        else { await setDoc(target, make()); await assertFails(updateDoc(target, { updatedAt: serverTimestamp(), ...patch })) }
      })
    }
    it(`${collectionName}: denies unchanged stale updatedAt`, async () => {
      const target = ref(userDb()); await setDoc(target, make())
      await assertFails(updateDoc(target, collectionName === 'lists' ? { name: 'New' } : { watchlist: true }))
    })
    it(`${collectionName}: nested paths remain deny-all`, async () => {
      const target = doc(userDb(), 'users', 'alice', collectionName, id, 'private', 'data')
      await assertFails(setDoc(target, { value: true })); await assertFails(getDoc(target))
    })
  }

  for (const id of ['short', 'a'.repeat(19), 'a'.repeat(21), 'a'.repeat(19) + '_', 'é'.repeat(20), ' '.repeat(20)]) it(`lists: invalid ID ${JSON.stringify(id)}`, async () => {
    await assertFails(setDoc(doc(userDb(), 'users/alice/lists', id), libraryList()))
  })
  for (const patch of [{ name: '' }, { name: ' \t\n' }, { name: '\u00a0\u2003' }, { name: '\v\ufeff' }, { name: 42 }, { name: null }, { name: 'a'.repeat(61) }, { description: 42 }, { description: null }, { description: 'a'.repeat(301) }]) {
    for (const action of ['create', 'update']) it(`lists: ${action} invalid ${JSON.stringify(patch)}`, async () => {
      const target = doc(userDb(), 'users/alice/lists', listId)
      if (action === 'create') await assertFails(setDoc(target, libraryList(patch)))
      else { await setDoc(target, libraryList()); await assertFails(updateDoc(target, { ...patch, updatedAt: serverTimestamp() })) }
    })
  }
  for (const name of ['A', 'a'.repeat(60), '\n A \n', 'Кино']) it(`lists: valid name length ${name.length}`, async () => {
    await assertSucceeds(setDoc(doc(userDb(), 'users/alice/lists', listId), libraryList({ name, description: 'a'.repeat(300) })))
  })
  for (const [key, patch] of [['movie_1', { tmdbId: 1 }], ['tv_1396', { tmdbId: 1396, mediaType: 'tv' }], ['movie_999999999999', { tmdbId: 999999999999 }]]) it(`savedMedia: valid ${key}`, async () => {
    await assertSucceeds(setDoc(doc(userDb(), 'users/alice/savedMedia', key), savedMedia(patch)))
  })
  for (const key of ['movie_0', 'movie_0123', 'movie_1000000000000', 'person_123', 'Movie_123', 'movie_-1', 'movie_1.5', 'movie_1e3', 'movie_123 ', 'movie_１２３', 'tv_123', 'movie_124']) it(`savedMedia: invalid/mismatched key ${key}`, async () => {
    await assertFails(setDoc(doc(userDb(), 'users/alice/savedMedia', key), savedMedia()))
  })
  const invalidMedia = [
    ...[0, -1, 1.5, 1000000000000, '123', null].map(tmdbId => ({ tmdbId })),
    ...['person', '', 'Movie', null, 3].map(mediaType => ({ mediaType })),
    ...['', ' \n\t', '\u00a0', 'a'.repeat(201), 42, null].map(title => ({ title })),
    ...['https://example.invalid/p.jpg', '//example.invalid/p?x', '/p.jpg?q=1', '/p.jpg#fragment', '/p\\x.jpg', '/p x.jpg', '/p\nx.jpg', '/p\tx.jpg', '/p\u00a0x.jpg', 'p.jpg', '/', '/../p.jpg', '/' + 'a'.repeat(200), 42, false].map(posterPath => ({ posterPath })),
    ...[1799, 2201, 2000.5, '2000', false].map(releaseYear => ({ releaseYear })),
    ...[null, 0, 'true'].flatMap(value => [{ favorite: value }, { watchlist: value }]),
    ...[null, {}, 'list', 42, Array.from({ length: 21 }, (_, i) => String(i)), [listId, listId]].map(listIds => ({ listIds })),
    { favorite: false, watchlist: false, listIds: [] },
  ]
  for (const patch of invalidMedia) for (const action of ['create', 'update']) it(`savedMedia: rejects ${action} ${JSON.stringify(patch)}`, async () => {
    const target = doc(userDb(), 'users/alice/savedMedia/movie_123')
    if (action === 'create') await assertFails(setDoc(target, savedMedia(patch)))
    else { await setDoc(target, savedMedia()); await assertFails(updateDoc(target, { ...patch, updatedAt: serverTimestamp() })) }
  })
  for (const patch of [{ posterPath: null }, { posterPath: '/poster-123_test.jpg' }, { posterPath: '/' + 'a'.repeat(199) }, { releaseYear: 1800 }, { releaseYear: 2200 }, { title: 'a'.repeat(200) }, { favorite: false, watchlist: true }, { favorite: false, listIds: [listId] }, { listIds: Array.from({ length: 20 }, (_, i) => String(i).padStart(20, 'a')) }]) it(`savedMedia: accepts boundary ${JSON.stringify(patch)}`, async () => {
    await assertSucceeds(setDoc(doc(userDb(), 'users/alice/savedMedia/movie_123'), savedMedia(patch)))
  })
  it('savedMedia: identity remains immutable during update', async () => {
    const target = doc(userDb(), 'users/alice/savedMedia/movie_123'); await setDoc(target, savedMedia())
    for (const patch of [{ tmdbId: 124 }, { mediaType: 'tv' }, { createdAt: serverTimestamp() }]) await assertFails(updateDoc(target, { ...patch, updatedAt: serverTimestamp() }))
  })
  it('savedMedia: accepts multiple memberships then removes them without deleting others', async () => {
    const target = doc(userDb(), 'users/alice/savedMedia/movie_123'); await setDoc(target, savedMedia())
    await assertSucceeds(updateDoc(target, { favorite: true, watchlist: true, listIds: [listId], updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(target, { favorite: false, watchlist: false, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(target, { listIds: [], updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(target))
  })
  it('boundary: listIds element format/type/existence is not guaranteed', async () => {
    await assertSucceeds(setDoc(doc(userDb(), 'users/alice/savedMedia/movie_123'), savedMedia({ favorite: false, listIds: [123, 'not-an-auto-id', null] })))
  })
  it('boundary: deleting a list does not cascade or prevent dangling IDs', async () => {
    const db = userDb(), target = doc(db, 'users/alice/lists', listId), media = doc(db, 'users/alice/savedMedia/movie_123')
    await setDoc(target, libraryList()); await setDoc(media, savedMedia({ listIds: [listId] }))
    await assertSucceeds(deleteDoc(target)); assert.deepEqual((await getDoc(media)).data().listIds, [listId])
  })
  for (const [field, operator, value] of [['favorite', '==', true], ['watchlist', '==', true], ['listIds', 'array-contains', listId]]) it(`owner planned query ${field}`, async () => {
    const db = userDb()
    await setDoc(doc(db, 'users/alice/savedMedia/movie_123'), savedMedia({ watchlist: true, listIds: [listId] }))
    assert.equal((await assertSucceeds(getDocs(query(collection(db, 'users/alice/savedMedia'), where(field, operator, value))))).size, 1)
    await assertFails(getDocs(query(collection(userDb('bob'), 'users/alice/savedMedia'), where(field, operator, value))))
  })

})
