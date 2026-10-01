import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection, collectionGroup, deleteDoc, deleteField, doc, getDoc, getDocs, serverTimestamp,
  setDoc, Timestamp, updateDoc, writeBatch, query, where, orderBy, limit, startAfter,
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
  avatarId: 'avatar_01',
  profileVisibility: 'private',
  onboardingCompleted: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
})
const publicProfile = (userId = 'alice', source = profile(), overrides = {}) => ({
  userId,
  username: source.username ?? 'alice_123',
  displayName: source.displayName ?? 'Alice',
  avatarId: source.avatarId ?? 'avatar_01',
  profileVisibility: source.profileVisibility ?? 'private',
  createdAt: source.createdAt ?? serverTimestamp(),
  updatedAt: source.updatedAt ?? serverTimestamp(),
  ...overrides,
})

const reservation = (userId = 'alice', overrides = {}) => ({
  userId, createdAt: serverTimestamp(), ...overrides,
})
const userDb = (uid = 'alice') => testEnv.authenticatedContext(uid).firestore()

function createPair(db, {
  uid = 'alice', username = 'alice_123', profileData = profile(username),
  publicProfileData = publicProfile(uid, profileData),
  reservationData = reservation(uid),
} = {}) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', uid), profileData)
  batch.set(doc(db, 'publicProfiles', uid), publicProfileData)
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

// Stage 8.1: private ratings and public comments; fixtures are synthetic, demo-only.
const ratingData = (patch = {}) => ({ tmdbId: 123, mediaType: 'movie', title: 'Synthetic title', posterPath: null, releaseYear: null, score: 7, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...patch })
const commentData = (patch = {}) => ({ tmdbId: 123, mediaType: 'movie', authorUsername: 'alice_123', authorDisplayName: 'Alice', text: 'Synthetic comment', containsSpoiler: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...patch })
const ratingRef = (db, key = 'movie_123', uid = 'alice') => doc(db, 'users', uid, 'ratings', key)
const commentRef = (db, key = 'movie_123', uid = 'alice') => doc(db, 'mediaComments', key, 'comments', uid)
const commentsQuery = db => collection(db, 'mediaComments/movie_123/comments')
async function seedCompletedProfile(patch = {}) {
  await testEnv.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'users/alice'), profile(undefined, { onboardingCompleted: true, ...patch })))
}

describe('Ratings and comments security model', { concurrency: false }, () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } })
  })
  beforeEach(async () => { await testEnv.clearFirestore(); await seedCompletedProfile() })
  after(async () => { await testEnv?.cleanup() })

  for (const [kind, make, ref] of [['rating', ratingData, ratingRef], ['comment', commentData, commentRef]]) {
    describe(`${kind}: schema and identity`, () => {
      for (const [key, identity] of [['movie_1', { tmdbId: 1 }], ['tv_1396', { mediaType: 'tv', tmdbId: 1396 }], ['movie_999999999999', { tmdbId: 999999999999 }]]) {
        it(`allows valid ${key} with server timestamps`, async () => {
          const target = ref(userDb(), key)
          await assertSucceeds(setDoc(target, make(identity)))
          const data = (await assertSucceeds(getDoc(target))).data()
          assert.ok(data.createdAt instanceof Timestamp)
          assert.ok(data.createdAt.isEqual(data.updatedAt))
        })
      }
      for (const key of ['movie_0', 'movie_0123', 'movie_1000000000000', 'person_123', 'actor_123', 'Movie_123', 'movie_-1', 'movie_1.5', 'movie_1e3', 'movie_123 ', 'movie_１２３', 'tv_123', 'movie_124']) {
        it(`rejects invalid or mismatched key ${key}`, async () => { await assertFails(setDoc(ref(userDb(), key), make())) })
      }
      const invalidIdentity = [
        ...[0, -1, 1.5, 1000000000000, '123', null, true].map(tmdbId => ({ tmdbId })),
        ...['person', 'actor', 'Movie', '', null, 42].map(mediaType => ({ mediaType })),
      ]
      for (const patch of invalidIdentity) for (const operation of ['create', 'update']) {
        it(`rejects ${operation} identity ${JSON.stringify(patch)}`, async () => {
          const target = ref(userDb())
          if (operation === 'create') await assertFails(setDoc(target, make(patch)))
          else { await setDoc(target, make()); await assertFails(updateDoc(target, { ...patch, updatedAt: serverTimestamp() })) }
        })
      }
      for (const field of Object.keys(make())) for (const operation of ['create', 'update']) {
        it(`rejects ${operation} missing ${field}`, async () => {
          const target = ref(userDb())
          if (operation === 'create') { const data = make(); delete data[field]; await assertFails(setDoc(target, data)) }
          else { await setDoc(target, make()); await assertFails(updateDoc(target, { [field]: deleteField(), ...(field === 'updatedAt' ? {} : { updatedAt: serverTimestamp() }) })) }
        })
      }
      for (const patch of [{ extra: true }, { email: 'fixture@example.invalid' }, { createdAt: Timestamp.fromMillis(0) }, { updatedAt: Timestamp.fromMillis(0) }, { createdAt: 'invalid' }, { updatedAt: null }]) {
        for (const operation of ['create', 'update']) it(`rejects ${operation} fields/timestamps ${JSON.stringify(patch)}`, async () => {
          const target = ref(userDb())
          if (operation === 'create') await assertFails(setDoc(target, make(patch)))
          else { await setDoc(target, make()); await assertFails(updateDoc(target, { updatedAt: serverTimestamp(), ...patch })) }
        })
      }
      for (const patch of [{ tmdbId: 124 }, { mediaType: 'tv' }, { createdAt: serverTimestamp() }]) {
        it(`preserves immutable ${Object.keys(patch)[0]}`, async () => {
          const target = ref(userDb()); await setDoc(target, make())
          await assertFails(updateDoc(target, { ...patch, updatedAt: serverTimestamp() }))
        })
      }
      it('rejects stale updatedAt', async () => {
        const target = ref(userDb()); await setDoc(target, make())
        await assertFails(updateDoc(target, kind === 'rating' ? { score: 9 } : { text: 'Edited' }))
      })
      for (const state of ['missing', 'incomplete']) it(`rejects create with ${state} profile`, async () => {
        await testEnv.withSecurityRulesDisabled(async c => {
          if (state === 'missing') await deleteDoc(doc(c.firestore(), 'users/alice'))
          else await updateDoc(doc(c.firestore(), 'users/alice'), { onboardingCompleted: false })
        })
        await assertFails(setDoc(ref(userDb()), make()))
      })
      it('does not accept profile completion in the same batch', async () => {
        await seedCompletedProfile({ onboardingCompleted: false })
        const db = userDb(), batch = writeBatch(db)
        batch.set(summaryRef(db), summaryData()); batch.update(doc(db, 'users/alice'), completionPatch())
        batch.set(ref(db), make())
        await assertFails(batch.commit())
        assert.equal((await getDoc(doc(db, 'users/alice'))).data().onboardingCompleted, false)
      })
      for (const identity of ['guest', 'bob']) for (const operation of ['create', 'update', 'delete']) {
        it(`rejects ${identity} ${operation} for author path`, async () => {
          if (operation !== 'create') await setDoc(ref(userDb()), make())
          const db = identity === 'guest' ? testEnv.unauthenticatedContext().firestore() : userDb(identity)
          const target = ref(db)
          const actions = { create: () => setDoc(target, make()), update: () => updateDoc(target, { updatedAt: serverTimestamp() }), delete: () => deleteDoc(target) }
          await assertFails(actions[operation]())
        })
      }
      it('allows only one document per user/media, full replacement is still an update', async () => {
        const db = userDb(), target = ref(db)
        await setDoc(target, make())
        const initial = (await getDoc(target)).data()
        await assertFails(setDoc(target, make()))
        await assertSucceeds(setDoc(target, make({ createdAt: initial.createdAt })))
        const source = kind === 'rating' ? collection(db, 'users/alice/ratings') : commentsQuery(db)
        assert.equal((await getDocs(query(source, limit(20)))).size, 1)
      })
      it('denies nested unknown collection', async () => {
        const target = doc(ref(userDb()), 'private/data')
        await assertFails(getDoc(target)); await assertFails(setDoc(target, { synthetic: true }))
      })
    })
  }

  describe('Private ratings', () => {
    it('allows owner get/list/edit snapshot/score/delete', async () => {
      const db = userDb(), target = ratingRef(db)
      await setDoc(target, ratingData())
      const initial = (await getDoc(target)).data()
      assert.equal((await assertSucceeds(getDocs(collection(db, 'users/alice/ratings')))).size, 1)
      await assertSucceeds(updateDoc(target, { score: 10, title: 'Refreshed title', posterPath: '/poster.jpg', releaseYear: 2026, updatedAt: serverTimestamp() }))
      const updated = (await getDoc(target)).data()
      assert.equal(updated.score, 10); assert.equal(updated.title, 'Refreshed title')
      assert.ok(updated.createdAt.isEqual(initial.createdAt))
      await assertSucceeds(deleteDoc(target))
    })
    for (const identity of ['guest', 'bob']) for (const operation of ['get', 'list', 'group']) it(`denies ${identity} rating ${operation}`, async () => {
      await setDoc(ratingRef(userDb()), ratingData())
      const db = identity === 'guest' ? testEnv.unauthenticatedContext().firestore() : userDb(identity)
      await assertFails(operation === 'get' ? getDoc(ratingRef(db)) : getDocs(operation === 'list' ? collection(db, 'users/alice/ratings') : collectionGroup(db, 'ratings')))
    })
    it('denies even owner collection-group ratings with a limit', async () => {
      await setDoc(ratingRef(userDb()), ratingData())
      await assertFails(getDocs(query(collectionGroup(userDb(), 'ratings'), limit(20))))
    })
    for (const state of ['missing', 'incomplete']) it(`denies rating update with ${state} profile but permits owner get/delete`, async () => {
      const db = userDb(), target = ratingRef(db); await setDoc(target, ratingData())
      await testEnv.withSecurityRulesDisabled(c => state === 'missing' ? deleteDoc(doc(c.firestore(), 'users/alice')) : updateDoc(doc(c.firestore(), 'users/alice'), { onboardingCompleted: false }))
      await assertFails(updateDoc(target, { score: 8, updatedAt: serverTimestamp() }))
      await assertSucceeds(getDoc(target)); await assertSucceeds(deleteDoc(target))
    })
    const invalidRating = [
      ...[0, 11, -1, 1.5, '5', null, true].map(score => ({ score })),
      ...['', ' \n\t', '\u00a0\u2003', '\v\ufeff', 'a'.repeat(201), 42, null].map(title => ({ title })),
      ...['https://example.invalid/p.jpg', '//example.invalid/p?x', '/p.jpg?q=1', '/p.jpg#fragment', '/p\\x.jpg', '/p x.jpg', '/p\nx.jpg', '/p\tx.jpg', '/p\u00a0x.jpg', 'p.jpg', '/', '/../p.jpg', '/%2e%2e/p.jpg', '/' + 'a'.repeat(200), 42, false].map(posterPath => ({ posterPath })),
      ...[1799, 2201, 2000.5, '2000', false].map(releaseYear => ({ releaseYear })),
    ]
    for (const patch of invalidRating) for (const operation of ['create', 'update']) it(`rejects ${operation} rating ${JSON.stringify(patch)}`, async () => {
      const target = ratingRef(userDb())
      if (operation === 'create') await assertFails(setDoc(target, ratingData(patch)))
      else { await setDoc(target, ratingData()); await assertFails(updateDoc(target, { ...patch, updatedAt: serverTimestamp() })) }
    })
    for (const patch of [{ score: 1 }, { score: 10 }, { posterPath: '/safe-poster_1.jpg' }, { posterPath: '/' + 'a'.repeat(199) }, { releaseYear: 1800 }, { releaseYear: 2200 }, { title: 'a'.repeat(200) }, { title: '\nКино\n' }]) it(`accepts rating boundary ${JSON.stringify(patch)}`, async () => {
      await assertSucceeds(setDoc(ratingRef(userDb()), ratingData(patch)))
    })
  })

  describe('Public comments', () => {
    it('author edits text and spoiler while preserving snapshot/createdAt, then deletes', async () => {
      const db = userDb(), target = commentRef(db); await setDoc(target, commentData())
      const initial = (await getDoc(target)).data()
      await assertSucceeds(updateDoc(target, { text: 'Edited comment', updatedAt: serverTimestamp() }))
      await assertSucceeds(updateDoc(target, { containsSpoiler: true, updatedAt: serverTimestamp() }))
      const updated = (await getDoc(target)).data()
      assert.equal(updated.text, 'Edited comment'); assert.equal(updated.containsSpoiler, true)
      assert.ok(updated.createdAt.isEqual(initial.createdAt))
      assert.equal(updated.authorUsername, initial.authorUsername)
      await assertSucceeds(deleteDoc(target))
    })
    for (const identity of ['guest', 'bob']) {
      const dbFor = () => identity === 'guest' ? testEnv.unauthenticatedContext().firestore() : userDb(identity)
      it(`${identity} can get a comment without reading private profile`, async () => {
        await setDoc(commentRef(userDb()), commentData())
        await assertSucceeds(getDoc(commentRef(dbFor())))
        await assertFails(getDoc(doc(dbFor(), 'users/alice')))
      })
      for (const count of [1, 20]) it(`${identity} public list with limit ${count}`, async () => {
        await setDoc(commentRef(userDb()), commentData())
        const result = await assertSucceeds(getDocs(query(commentsQuery(dbFor()), orderBy('updatedAt', 'desc'), limit(count))))
        assert.equal(result.size, 1)
      })
      for (const count of [undefined, 21]) it(`${identity} denied list limit ${count}`, async () => {
        await setDoc(commentRef(userDb()), commentData())
        const constraints = [orderBy('updatedAt', 'desc')]
        if (count !== undefined) constraints.push(limit(count))
        await assertFails(getDocs(query(commentsQuery(dbFor()), ...constraints)))
      })
      it(`${identity} comments collection-group denied`, async () => {
        await setDoc(commentRef(userDb()), commentData())
        await assertFails(getDocs(query(collectionGroup(dbFor(), 'comments'), limit(20))))
      })
    }
    it('denies public REST query with zero limit (SDK normally rejects it before Rules)', async () => {
      const response = await fetch(`http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/mediaComments/movie_123:runQuery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'comments' }], limit: 0 } }),
      })
      assert.equal(response.status, 403)
    })
    for (const [label, sort] of [['default', []], ['updatedAt asc', [orderBy('updatedAt', 'asc')]], ['text desc', [orderBy('text', 'desc')]]]) {
      it(`documents fallback: bounded public query accepts sort variant ${label}`, async () => {
        await setDoc(commentRef(userDb()), commentData())
        await assertSucceeds(getDocs(query(commentsQuery(testEnv.unauthenticatedContext().firestore()), ...sort, limit(20))))
      })
    }
    it('two authors can comment on the same media without exposing their profiles', async () => {
      await testEnv.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'users/bob'), profile('bob_123', { displayName: 'Bob', onboardingCompleted: true })))
      await assertSucceeds(setDoc(commentRef(userDb()), commentData()))
      await assertSucceeds(setDoc(commentRef(userDb('bob'), 'movie_123', 'bob'), commentData({ authorUsername: 'bob_123', authorDisplayName: 'Bob' })))
      const comments = await assertSucceeds(getDocs(query(commentsQuery(testEnv.unauthenticatedContext().firestore()), orderBy('updatedAt', 'desc'), limit(20))))
      assert.equal(comments.size, 2)
    })
    it('supports cursor pagination without new composite index', async () => {
      const guest = testEnv.unauthenticatedContext().firestore()
      await setDoc(commentRef(userDb()), commentData())
      const first = await getDocs(query(commentsQuery(guest), orderBy('updatedAt', 'desc'), limit(20)))
      const next = await assertSucceeds(getDocs(query(commentsQuery(guest), orderBy('updatedAt', 'desc'), startAfter(first.docs[0]), limit(20))))
      assert.equal(next.size, 0)
    })
    for (const field of ['authorUsername', 'authorDisplayName']) {
      for (const value of ['Impersonated', null, 123]) it(`rejects author snapshot ${field} ${JSON.stringify(value)}`, async () => {
        await assertFails(setDoc(commentRef(userDb()), commentData({ [field]: value })))
      })
      it(`rejects update to immutable ${field} even after a profile change`, async () => {
        const target = commentRef(userDb()); await setDoc(target, commentData())
        await testEnv.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'users/alice'), { [field === 'authorUsername' ? 'username' : 'displayName']: 'NewSnapshot' }))
        await assertFails(updateDoc(target, { [field]: 'NewSnapshot', updatedAt: serverTimestamp() }))
        await assertSucceeds(updateDoc(target, { text: 'Edit keeps original attribution', updatedAt: serverTimestamp() }))
      })
    }
    it('owner may edit/delete existing comment after profile deletion; no auto snapshot refresh', async () => {
      const target = commentRef(userDb()); await setDoc(target, commentData())
      await testEnv.withSecurityRulesDisabled(c => deleteDoc(doc(c.firestore(), 'users/alice')))
      await assertSucceeds(updateDoc(target, { text: 'Still authored by the same user', updatedAt: serverTimestamp() }))
      await assertSucceeds(deleteDoc(target))
    })
    const invalidComment = [
      ...['', ' \n\t', '\u00a0\u2003', '\v\ufeff', 'a'.repeat(2001), null, 123, [], {}].map(text => ({ text })),
      ...[null, 'true', 0, []].map(containsSpoiler => ({ containsSpoiler })),
    ]
    for (const patch of invalidComment) for (const operation of ['create', 'update']) it(`rejects ${operation} comment ${JSON.stringify(patch).slice(0, 90)}`, async () => {
      const target = commentRef(userDb())
      if (operation === 'create') await assertFails(setDoc(target, commentData(patch)))
      else { await setDoc(target, commentData()); await assertFails(updateDoc(target, { ...patch, updatedAt: serverTimestamp() })) }
    })
    for (const text of ['x', 'a'.repeat(2000), '\nОтзыв\n', '<b>Untrusted text, not HTML</b>']) it(`accepts text boundary length ${text.length}`, async () => {
      await assertSucceeds(setDoc(commentRef(userDb()), commentData({ text })))
    })
    for (const identity of ['guest', 'alice']) for (const path of ['mediaComments/movie_123', 'mediaComments/movie_123/private/data', 'mediaComments/movie_123/comments/alice/private/data']) it(`denies ${identity} parent/unknown path ${path}`, async () => {
      const db = identity === 'guest' ? testEnv.unauthenticatedContext().firestore() : userDb()
      await assertFails(getDoc(doc(db, path))); await assertFails(setDoc(doc(db, path), { synthetic: true }))
    })
    it('does not make parent collection list public', async () => {
      await assertFails(getDocs(query(collection(testEnv.unauthenticatedContext().firestore(), 'mediaComments'), limit(20))))
    })
  })
})

// Stage 9.2: private MovieDNA output/state and a completely server-only media cache.
const dnaTimestamp = () => Timestamp.fromMillis(1_800_000_000_000)
const dnaDimension = (key = 'genre:28', label = 'Action') => ({
  key, label, score: 0.5, evidenceCount: 3, confidence: 0.6,
})
const dnaCurrentData = () => ({
  schemaVersion: 1,
  algorithmVersion: 'moviedna-v1.0.0',
  status: 'ready',
  inputFingerprint: `sha256:${'a'.repeat(64)}`,
  sourceCounts: {
    ratingsRead: 3, onboardingRead: 10, favoritesRead: 1,
    uniqueNonZeroUsed: 9, ratingUsed: 3, onboardingUsed: 5,
    favoriteUsed: 1, neutralOrSkipped: 4, shadowedByHigherPriority: 1,
    discardedSourceCount: 0, enrichedUsed: 9, unavailableMetadata: 0,
  },
  metadataCoverage: 1,
  confidence: 0.545,
  dimensions: {
    genres: [dnaDimension()],
    mediaTypes: [dnaDimension('media:movie', 'Movies')],
    decades: [dnaDimension('decade:2010', '2010s')],
    languages: [dnaDimension('language:en', 'English')],
    countries: [dnaDimension('country:US', 'United States')],
    directors: [dnaDimension('person:20', 'Synthetic Director')],
    creators: [],
    actors: [dnaDimension('person:10', 'Synthetic Actor')],
  },
  calculatedAt: dnaTimestamp(),
  updatedAt: dnaTimestamp(),
})
const dnaRecalculationData = () => ({
  schemaVersion: 1,
  status: 'succeeded',
  requestedAt: dnaTimestamp(),
  startedAt: dnaTimestamp(),
  completedAt: dnaTimestamp(),
  nextEligibleAt: dnaTimestamp(),
  algorithmVersion: 'moviedna-v1.0.0',
  inputFingerprint: `sha256:${'a'.repeat(64)}`,
  errorCode: null,
})
const mediaSignalData = () => ({
  schemaVersion: 1,
  tmdbId: 123,
  mediaType: 'movie',
  genreIds: [28],
  releaseYear: 2020,
  originalLanguage: 'en',
  countryCodes: ['US'],
  directors: [{ id: 20, name: 'Synthetic Director' }],
  creators: [],
  actors: [{ id: 10, name: 'Synthetic Actor', billingOrder: 0 }],
  fetchedAt: dnaTimestamp(),
  expiresAt: dnaTimestamp(),
  metadataStatus: 'ready',
  metadataCompleteness: {
    genres: true, releaseYear: true, originalLanguage: true,
    countries: true, people: true,
  },
})

describe('MovieDNA security model', { concurrency: false }, () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: '127.0.0.1', port: 8080,
        rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
      },
    })
  })
  beforeEach(async () => {
    await testEnv.clearFirestore()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'users/alice/movieDna/current'), dnaCurrentData())
      await setDoc(doc(db, 'users/alice/movieDna/recalculation'), dnaRecalculationData())
      await setDoc(doc(db, 'mediaSignals/movie_123'), mediaSignalData())
    })
  })
  after(async () => { await testEnv?.cleanup() })

  async function deleteFixture(path) {
    await testEnv.withSecurityRulesDisabled(context => deleteDoc(doc(context.firestore(), path)))
  }
  function dbFor(identity) {
    return identity === 'guest' ? testEnv.unauthenticatedContext().firestore() : userDb(identity)
  }

  for (const [documentId, make] of [['current', dnaCurrentData], ['recalculation', dnaRecalculationData]]) {
    const path = `users/alice/movieDna/${documentId}`
    it(`allows owner get of movieDna/${documentId}`, async () => {
      await assertSucceeds(getDoc(doc(userDb(), path)))
    })
    it(`denies owner list around movieDna/${documentId}`, async () => {
      await assertFails(getDocs(collection(userDb(), 'users/alice/movieDna')))
    })
    for (const operation of ['create', 'update', 'delete']) {
      it(`denies owner ${operation} of movieDna/${documentId}`, async () => {
        const target = doc(userDb(), path)
        if (operation === 'create') { await deleteFixture(path); await assertFails(setDoc(target, make())) }
        else if (operation === 'update') await assertFails(updateDoc(target, { status: 'failed' }))
        else await assertFails(deleteDoc(target))
      })
    }
    for (const identity of ['bob', 'guest']) {
      it(`denies ${identity} get of movieDna/${documentId}`, async () => {
        await assertFails(getDoc(doc(dbFor(identity), path)))
      })
      it(`denies ${identity} list around movieDna/${documentId}`, async () => {
        await assertFails(getDocs(collection(dbFor(identity), 'users/alice/movieDna')))
      })
      for (const operation of ['create', 'update', 'delete']) {
        it(`denies ${identity} ${operation} of movieDna/${documentId}`, async () => {
          const target = doc(dbFor(identity), path)
          if (operation === 'create') { await deleteFixture(path); await assertFails(setDoc(target, make())) }
          else if (operation === 'update') await assertFails(updateDoc(target, { status: 'failed' }))
          else await assertFails(deleteDoc(target))
        })
      }
    }
  }

  for (const identity of ['guest', 'alice', 'bob']) {
    const path = 'mediaSignals/movie_123'
    it(`denies ${identity} get of mediaSignals`, async () => {
      await assertFails(getDoc(doc(dbFor(identity), path)))
    })
    it(`denies ${identity} list of mediaSignals`, async () => {
      await assertFails(getDocs(collection(dbFor(identity), 'mediaSignals')))
    })
    for (const operation of ['create', 'update', 'delete']) {
      it(`denies ${identity} ${operation} of mediaSignals`, async () => {
        const target = doc(dbFor(identity), path)
        if (operation === 'create') { await deleteFixture(path); await assertFails(setDoc(target, mediaSignalData())) }
        else if (operation === 'update') await assertFails(updateDoc(target, { metadataStatus: 'missing' }))
        else await assertFails(deleteDoc(target))
      })
    }
  }

  it('allows the rules-disabled Admin test context to prepare all fixtures', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      assert.equal((await getDoc(doc(db, 'users/alice/movieDna/current'))).exists(), true)
      assert.equal((await getDoc(doc(db, 'users/alice/movieDna/recalculation'))).exists(), true)
      assert.equal((await getDoc(doc(db, 'mediaSignals/movie_123'))).exists(), true)
    })
  })
  it('denies owner access to an unknown movieDna document', async () => {
    await assertFails(getDoc(doc(userDb(), 'users/alice/movieDna/history')))
  })
  it('keeps unknown nested MovieDNA and mediaSignals paths deny-by-default', async () => {
    for (const path of ['users/alice/movieDna/current/private/data', 'mediaSignals/movie_123/private/data']) {
      await assertFails(getDoc(doc(userDb(), path)))
      await assertFails(setDoc(doc(userDb(), path), { synthetic: true }))
    }
  })
})

const viewingData = (overrides = {}) => ({
  schemaVersion: 1,
  tmdbId: 550,
  mediaType: 'movie',
  title: 'Fight Club',
  posterPath: '/poster.jpg',
  releaseYear: 1999,
  genres: [
    { id: 18, name: 'Drama' },
    { id: 53, name: 'Thriller' },
  ],
  directors: [
    { id: 7467, name: 'David Fincher' },
  ],
  creators: [],
  watchedDate: '2026-09-29',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
})

const viewingRef = (
  db,
  uid = 'alice',
  id = 'ABCDEFGHIJKLMNOPQRST',
) => doc(
  db,
  'users',
  uid,
  'viewingHistory',
  id,
)

async function seedCompletedPair() {
  await testEnv.withSecurityRulesDisabled(async context => {
    await createPair(context.firestore(), {
      profileData: profile(
        'alice_123',
        { onboardingCompleted: true },
      ),
    })
  })
}

describe(
  'Viewing history security rules',
  { concurrency: false },
  () => {
    before(async () => {
      testEnv = await initializeTestEnvironment({
        projectId,
        firestore: {
          host: '127.0.0.1',
          port: 8080,
          rules: await readFile(
            new URL(
              '../firestore.rules',
              import.meta.url,
            ),
            'utf8',
          ),
        },
      })
    })

    beforeEach(async () => {
      await testEnv.clearFirestore()
      await seedCompletedPair()
    })

    after(async () => {
      await testEnv?.cleanup()
    })

    it('allows owner create, get, list and delete', async () => {
      const db = userDb()
      const ref = viewingRef(db)

      await assertSucceeds(
        setDoc(ref, viewingData()),
      )

      await assertSucceeds(getDoc(ref))

      assert.equal(
        (
          await assertSucceeds(
            getDocs(
              collection(
                db,
                'users/alice/viewingHistory',
              ),
            ),
          )
        ).size,
        1,
      )

      await assertSucceeds(deleteDoc(ref))
    })

    it('allows changing only watchedDate', async () => {
      const db = userDb()
      const ref = viewingRef(db)

      await setDoc(ref, viewingData())

      await assertSucceeds(
        updateDoc(ref, {
          watchedDate: '2026-09-28',
          updatedAt: serverTimestamp(),
        }),
      )

      await assertFails(
        updateDoc(ref, {
          title: 'Changed title',
          updatedAt: serverTimestamp(),
        }),
      )

      await assertFails(
        updateDoc(ref, {
          tmdbId: 551,
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('denies access to another user and guests', async () => {
      const ref = viewingRef(userDb())
      await setDoc(ref, viewingData())

      const other = userDb('bob')
      const guest = testEnv
        .unauthenticatedContext()
        .firestore()

      await assertFails(
        getDoc(viewingRef(other)),
      )

      await assertFails(
        getDocs(
          collection(
            other,
            'users/alice/viewingHistory',
          ),
        ),
      )

      await assertFails(
        getDoc(viewingRef(guest)),
      )
    })

    it('requires a completed profile for creation', async () => {
      await testEnv.clearFirestore()
      await seedPair()

      await assertFails(
        setDoc(
          viewingRef(userDb()),
          viewingData(),
        ),
      )
    })

    it('rejects malformed event IDs and schemas', async () => {
      const db = userDb()

      await assertFails(
        setDoc(
          viewingRef(db, 'alice', 'short'),
          viewingData(),
        ),
      )

      await assertFails(
        setDoc(
          viewingRef(
            db,
            'alice',
            'QRSTUVWXYZABCDEFGHIJ',
          ),
          viewingData({
            watchedDate: '2026-9-29',
          }),
        ),
      )

      await assertFails(
        setDoc(
          viewingRef(
            db,
            'alice',
            '12345678901234567890',
          ),
          viewingData({
            schemaVersion: 2,
          }),
        ),
      )
    })

    it('enforces movie versus TV people roles', async () => {
      const db = userDb()

      await assertFails(
        setDoc(
          viewingRef(db),
          viewingData({
            creators: [
              { id: 1, name: 'Invalid creator' },
            ],
          }),
        ),
      )

      await assertSucceeds(
        setDoc(
          viewingRef(
            db,
            'alice',
            'QRSTUVWXYZABCDEFGHIJ',
          ),
          viewingData({
            tmdbId: 1396,
            mediaType: 'tv',
            title: 'Breaking Bad',
            directors: [],
            creators: [
              {
                id: 66633,
                name: 'Vince Gilligan',
              },
            ],
          }),
        ),
      )
    })
  },
)

describe('Stage 11 profile privacy fields', { concurrency: false }, () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: await readFile(
          new URL('../firestore.rules', import.meta.url),
          'utf8',
        ),
      },
    })
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
  })

  after(async () => {
    await testEnv?.cleanup()
  })

  for (const avatarId of [
    '',
    'avatar_00',
    'avatar_09',
    'custom-avatar',
    1,
    null,
  ]) {
    it(`denies invalid avatarId ${JSON.stringify(avatarId)}`, async () => {
      await assertFails(createPair(userDb(), {
        profileData: profile(undefined, { avatarId }),
      }))
    })
  }

  for (const avatarId of ['avatar_01', 'avatar_08']) {
    it(`allows avatarId ${avatarId}`, async () => {
      await assertSucceeds(createPair(userDb(), {
        profileData: profile(undefined, { avatarId }),
      }))
    })
  }

  for (const profileVisibility of [
    '',
    'friends',
    'PUBLIC',
    true,
    null,
  ]) {
    it(`denies invalid profileVisibility ${JSON.stringify(profileVisibility)}`, async () => {
      await assertFails(createPair(userDb(), {
        profileData: profile(undefined, { profileVisibility }),
      }))
    })
  }

  for (const profileVisibility of ['public', 'private']) {
    it(`allows profileVisibility ${profileVisibility}`, async () => {
      await assertSucceeds(createPair(userDb(), {
        profileData: profile(undefined, { profileVisibility }),
      }))
    })
  }

  it('creates the matching public profile in the registration bundle', async () => {
    const db = userDb()

    await assertSucceeds(createPair(db))

    const snapshot = await assertSucceeds(
      getDoc(doc(db, 'publicProfiles', 'alice')),
    )

    assert.deepEqual(
      {
        userId: snapshot.data().userId,
        username: snapshot.data().username,
        displayName: snapshot.data().displayName,
        avatarId: snapshot.data().avatarId,
        profileVisibility: snapshot.data().profileVisibility,
      },
      {
        userId: 'alice',
        username: 'alice_123',
        displayName: 'Alice',
        avatarId: 'avatar_01',
        profileVisibility: 'private',
      },
    )
  })

  it('denies registration when the public profile is omitted', async () => {
    const db = userDb()
    const batch = writeBatch(db)

    batch.set(doc(db, 'users', 'alice'), profile())
    batch.set(doc(db, 'usernames', 'alice_123'), reservation())

    await assertFails(batch.commit())
  })

  it('denies a public profile without its private user profile', async () => {
    const db = userDb()

    await assertFails(
      setDoc(
        doc(db, 'publicProfiles', 'alice'),
        publicProfile(),
      ),
    )
  })

  for (const [field, value] of [
    ['userId', 'bob'],
    ['username', 'another_name'],
    ['displayName', 'Another Name'],
    ['avatarId', 'avatar_08'],
    ['profileVisibility', 'public'],
  ]) {
    it(`denies a public profile whose ${field} does not match the private profile`, async () => {
      const db = userDb()
      const privateProfile = profile()

      await assertFails(
        createPair(db, {
          profileData: privateProfile,
          publicProfileData: publicProfile(
            'alice',
            privateProfile,
            { [field]: value },
          ),
        }),
      )
    })
  }

  it('allows the owner to read their private public-profile mirror', async () => {
    const db = userDb()
    await assertSucceeds(createPair(db))

    await assertSucceeds(
      getDoc(doc(db, 'publicProfiles', 'alice')),
    )
  })

  it('allows authenticated users to read private profile identity but denies guests', async () => {
    const ownerDb = userDb()

    await assertSucceeds(
      createPair(ownerDb),
    )

    const otherDb = userDb('bob')
    const guestDb = testEnv.unauthenticatedContext().firestore()

    await assertSucceeds(
      getDoc(
        doc(
          otherDb,
          'publicProfiles',
          'alice',
        ),
      ),
    )

    await assertFails(
      getDoc(
        doc(
          guestDb,
          'publicProfiles',
          'alice',
        ),
      ),
    )
  })

  it('allows authenticated users to read public profile identity but denies guests', async () => {
    const ownerDb = userDb()

    const profileData = profile(
      'alice_123',
      {
        profileVisibility: 'public',
      },
    )

    await assertSucceeds(
      createPair(ownerDb, {
        profileData,
        publicProfileData: publicProfile(
          'alice',
          profileData,
        ),
      }),
    )

    const otherDb = userDb('bob')
    const guestDb = testEnv.unauthenticatedContext().firestore()

    await assertSucceeds(
      getDoc(
        doc(
          otherDb,
          'publicProfiles',
          'alice',
        ),
      ),
    )

    await assertFails(
      getDoc(
        doc(
          guestDb,
          'publicProfiles',
          'alice',
        ),
      ),
    )
  })

  it('denies listing publicProfiles even when a public profile exists', async () => {
    const privateProfile = profile(
      undefined,
      { profileVisibility: 'public' },
    )

    await assertSucceeds(
      createPair(userDb(), {
        profileData: privateProfile,
      }),
    )

    await assertFails(
      getDocs(
        collection(
          userDb('bob'),
          'publicProfiles',
        ),
      ),
    )
  })

  it('denies direct public profile updates and deletion', async () => {
    const db = userDb()
    await assertSucceeds(createPair(db))

    const ref = doc(db, 'publicProfiles', 'alice')

    await assertFails(
      updateDoc(ref, {
        displayName: 'Changed',
        updatedAt: serverTimestamp(),
      }),
    )

    await assertFails(deleteDoc(ref))
  })


  it('allows the owner to update private and public profile settings atomically', async () => {
    const db = userDb()

    await assertSucceeds(createPair(db))

    const batch = writeBatch(db)

    batch.update(
      doc(db, 'users', 'alice'),
      {
        displayName: 'Alice Updated',
        avatarId: 'avatar_08',
        profileVisibility: 'public',
        updatedAt: serverTimestamp(),
      },
    )

    batch.set(
      doc(db, 'publicProfiles', 'alice'),
      {
        userId: 'alice',
        username: 'alice_123',
        displayName: 'Alice Updated',
        avatarId: 'avatar_08',
        profileVisibility: 'public',
        createdAt: (
          await getDoc(doc(db, 'users', 'alice'))
        ).data().createdAt,
        updatedAt: serverTimestamp(),
      },
    )

    await assertSucceeds(batch.commit())

    const privateData = (
      await getDoc(doc(db, 'users', 'alice'))
    ).data()

    const publicData = (
      await getDoc(doc(db, 'publicProfiles', 'alice'))
    ).data()

    assert.equal(privateData.displayName, 'Alice Updated')
    assert.equal(publicData.displayName, 'Alice Updated')
    assert.equal(privateData.avatarId, 'avatar_08')
    assert.equal(publicData.avatarId, 'avatar_08')
    assert.equal(privateData.profileVisibility, 'public')
    assert.equal(publicData.profileVisibility, 'public')
  })

  it('denies changing profile settings without synchronizing publicProfiles', async () => {
    const db = userDb()
    await assertSucceeds(createPair(db))

    await assertFails(
      updateDoc(
        doc(db, 'users', 'alice'),
        {
          displayName: 'Unsynced',
          updatedAt: serverTimestamp(),
        },
      ),
    )
  })

  it('denies changing publicProfiles without synchronizing the private profile', async () => {
    const db = userDb()
    await assertSucceeds(createPair(db))

    await assertFails(
      updateDoc(
        doc(db, 'publicProfiles', 'alice'),
        {
          displayName: 'Unsynced',
          updatedAt: serverTimestamp(),
        },
      ),
    )
  })

  it('denies mismatched values inside an atomic profile settings update', async () => {
    const db = userDb()
    await assertSucceeds(createPair(db))

    const current = (
      await getDoc(doc(db, 'users', 'alice'))
    ).data()

    const batch = writeBatch(db)

    batch.update(
      doc(db, 'users', 'alice'),
      {
        displayName: 'Private Name',
        updatedAt: serverTimestamp(),
      },
    )

    batch.set(
      doc(db, 'publicProfiles', 'alice'),
      {
        userId: 'alice',
        username: 'alice_123',
        displayName: 'Different Public Name',
        avatarId: 'avatar_01',
        profileVisibility: 'private',
        createdAt: current.createdAt,
        updatedAt: serverTimestamp(),
      },
    )

    await assertFails(batch.commit())
  })

  it('migrates a legacy profile during its first settings save', async () => {
    const createdAt = Timestamp.fromMillis(1000)

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', 'alice'),
        {
          username: 'alice_123',
          displayName: 'Alice',
          photoURL: null,
          bio: '',
          onboardingCompleted: true,
          createdAt,
          updatedAt: createdAt,
        },
      )
    })

    const db = userDb()
    const batch = writeBatch(db)

    batch.update(
      doc(db, 'users', 'alice'),
      {
        displayName: 'Migrated Alice',
        avatarId: 'avatar_02',
        profileVisibility: 'private',
        updatedAt: serverTimestamp(),
      },
    )

    batch.set(
      doc(db, 'publicProfiles', 'alice'),
      {
        userId: 'alice',
        username: 'alice_123',
        displayName: 'Migrated Alice',
        avatarId: 'avatar_02',
        profileVisibility: 'private',
        createdAt,
        updatedAt: serverTimestamp(),
      },
    )

    await assertSucceeds(batch.commit())

    const migrated = (
      await getDoc(doc(db, 'users', 'alice'))
    ).data()

    assert.equal(migrated.avatarId, 'avatar_02')
    assert.equal(migrated.profileVisibility, 'private')

    assert.equal(
      (
        await getDoc(
          doc(db, 'publicProfiles', 'alice'),
        )
      ).exists(),
      true,
    )
  })

  it('changing visibility to public keeps identity available to authenticated users only', async () => {
    const db = userDb()

    await assertSucceeds(
      createPair(db),
    )

    const current = (
      await getDoc(
        doc(
          db,
          'users',
          'alice',
        ),
      )
    ).data()

    const batch = writeBatch(db)

    batch.update(
      doc(db, 'users', 'alice'),
      {
        profileVisibility: 'public',
        updatedAt: serverTimestamp(),
      },
    )

    batch.set(
      doc(db, 'publicProfiles', 'alice'),
      {
        userId: 'alice',
        username: 'alice_123',
        displayName: 'Alice',
        avatarId: 'avatar_01',
        profileVisibility: 'public',
        createdAt: current.createdAt,
        updatedAt: serverTimestamp(),
      },
    )

    await assertSucceeds(
      batch.commit(),
    )

    const otherDb = userDb('bob')
    const guestDb = testEnv.unauthenticatedContext().firestore()

    await assertSucceeds(
      getDoc(
        doc(
          otherDb,
          'publicProfiles',
          'alice',
        ),
      ),
    )

    await assertFails(
      getDoc(
        doc(
          guestDb,
          'publicProfiles',
          'alice',
        ),
      ),
    )
  })

  it('denies an unauthenticated exact username lookup even for a public profile', async () => {
    const ownerDb = userDb()

    const profileData = profile(
      'alice_123',
      {
        profileVisibility: 'public',
      },
    )

    await assertSucceeds(
      createPair(ownerDb, {
        profileData,
        publicProfileData: publicProfile(
          'alice',
          profileData,
        ),
      }),
    )

    const guestDb = testEnv.unauthenticatedContext().firestore()

    await assertFails(
      getDoc(
        doc(
          guestDb,
          'usernames',
          'alice_123',
        ),
      ),
    )
  })

  it('denies an unauthenticated username lookup for a private profile', async () => {
    const ownerDb = userDb()

    await assertSucceeds(
      createPair(ownerDb),
    )

    const guestDb = testEnv.unauthenticatedContext().firestore()

    await assertFails(
      getDoc(
        doc(
          guestDb,
          'usernames',
          'alice_123',
        ),
      ),
    )
  })

  it('keeps exact private username lookup available to authenticated users', async () => {
    const ownerDb = userDb()

    await assertSucceeds(
      createPair(ownerDb),
    )

    const otherDb = userDb('bob')

    await assertSucceeds(
      getDoc(
        doc(
          otherDb,
          'usernames',
          'alice_123',
        ),
      ),
    )
  })

  it('continues to deny username collection discovery', async () => {
    const ownerDb = userDb()

    const profileData = profile(
      'alice_123',
      {
        profileVisibility: 'public',
      },
    )

    await assertSucceeds(
      createPair(ownerDb, {
        profileData,
        publicProfileData: publicProfile(
          'alice',
          profileData,
        ),
      }),
    )

    const guestDb = testEnv.unauthenticatedContext().firestore()

    await assertFails(
      getDocs(
        collection(
          guestDb,
          'usernames',
        ),
      ),
    )
  })


  it('allows authenticated users to read a preview for a public profile', async () => {
    const ownerDb = userDb()

    const profileData = profile('alice_123', {
      profileVisibility: 'public',
    })

    await assertSucceeds(
      createPair(ownerDb, {
        profileData,
        publicProfileData: publicProfile('alice', profileData),
      }),
    )

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'publicProfilePreviews', 'alice'),
        {
          schemaVersion: 1,
          dna: {
            genres: [
              {
                label: 'Drama',
                score: 0.8,
              },
            ],
          },
          statistics: {
            totalViewings: 3,
            movieCount: 2,
            tvCount: 1,
          },
          updatedAt: serverTimestamp(),
        },
      )
    })

    await assertSucceeds(
      getDoc(
        doc(
          userDb('bob'),
          'publicProfilePreviews',
          'alice',
        ),
      ),
    )
  })

  it('denies preview reads when the profile is private', async () => {
    await assertSucceeds(
      createPair(userDb()),
    )

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'publicProfilePreviews', 'alice'),
        {
          schemaVersion: 1,
          dna: { genres: [] },
          statistics: {
            totalViewings: 0,
            movieCount: 0,
            tvCount: 0,
          },
          updatedAt: serverTimestamp(),
        },
      )
    })

    await assertFails(
      getDoc(
        doc(
          userDb('bob'),
          'publicProfilePreviews',
          'alice',
        ),
      ),
    )
  })

  it('denies preview reads to unauthenticated visitors', async () => {
    const profileData = profile('alice_123', {
      profileVisibility: 'public',
    })

    await assertSucceeds(
      createPair(userDb(), {
        profileData,
        publicProfileData: publicProfile('alice', profileData),
      }),
    )

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'publicProfilePreviews', 'alice'),
        {
          schemaVersion: 1,
          dna: { genres: [] },
          statistics: {
            totalViewings: 0,
            movieCount: 0,
            tvCount: 0,
          },
          updatedAt: serverTimestamp(),
        },
      )
    })

    await assertFails(
      getDoc(
        doc(
          testEnv.unauthenticatedContext().firestore(),
          'publicProfilePreviews',
          'alice',
        ),
      ),
    )
  })

  it('denies listing public profile previews', async () => {
    await assertFails(
      getDocs(
        collection(
          userDb('bob'),
          'publicProfilePreviews',
        ),
      ),
    )
  })

  it('denies client writes to public profile previews', async () => {
    await assertFails(
      setDoc(
        doc(
          userDb(),
          'publicProfilePreviews',
          'alice',
        ),
        {
          schemaVersion: 1,
          dna: { genres: [] },
          statistics: {
            totalViewings: 0,
            movieCount: 0,
            tvCount: 0,
          },
          updatedAt: serverTimestamp(),
        },
      ),
    )
  })

})

describe('Stage 12 friendship security rules', { concurrency: false }, () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: await readFile(
          new URL('../firestore.rules', import.meta.url),
          'utf8',
        ),
      },
    })
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      const batch = writeBatch(db)

      for (const uid of ['alice', 'bob', 'charlie']) {
        batch.set(
          doc(db, 'publicProfiles', uid),
          { userId: uid },
        )
      }

      await batch.commit()
    })
  })

  after(async () => {
    await testEnv?.cleanup()
  })

  const orderedMembers = (first, second) =>
    [first, second].sort((a, b) => a.localeCompare(b))

  const friendshipId = (first, second) => {
    const [memberA, memberB] = orderedMembers(first, second)

    return createHash('sha256')
      .update(`${memberA}:${memberB}`, 'utf8')
      .digest('hex')
      .toUpperCase()
  }

  const friendshipRef = (
    db,
    first = 'alice',
    second = 'bob',
  ) => doc(
    db,
    'friendships',
    friendshipId(first, second),
  )

  const friendshipData = (
    requestedBy = 'alice',
    otherUser = 'bob',
    overrides = {},
  ) => ({
    members: orderedMembers(requestedBy, otherUser),
    requestedBy,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    acceptedAt: null,
    ...overrides,
  })

  async function createPendingFriendship(
    requester = 'alice',
    recipient = 'bob',
  ) {
    const db = userDb(requester)

    await assertSucceeds(
      setDoc(
        friendshipRef(db, requester, recipient),
        friendshipData(requester, recipient),
      ),
    )
  }

  it('creates one canonical pair ID regardless of direction', () => {
    assert.equal(
      friendshipId('alice', 'bob'),
      friendshipId('bob', 'alice'),
    )

    assert.match(
      friendshipId('alice', 'bob'),
      /^[A-F0-9]{64}$/,
    )
  })

  it('allows an authenticated user to create a pending request', async () => {
    const db = userDb('alice')

    await assertSucceeds(
      setDoc(
        friendshipRef(db),
        friendshipData(),
      ),
    )
  })

  it('denies unauthenticated friendship creation', async () => {
    const db = testEnv.unauthenticatedContext().firestore()

    await assertFails(
      setDoc(
        friendshipRef(db),
        friendshipData(),
      ),
    )
  })

  it('denies creating a request on behalf of another user', async () => {
    const db = userDb('charlie')

    await assertFails(
      setDoc(
        friendshipRef(db),
        friendshipData('alice', 'bob'),
      ),
    )
  })

  it('denies sending a friend request to yourself', async () => {
    const db = userDb('alice')

    await assertFails(
      setDoc(
        friendshipRef(db, 'alice', 'alice'),
        friendshipData('alice', 'alice'),
      ),
    )
  })

  it('denies a request when the other public profile does not exist', async () => {
    const db = userDb('alice')

    await assertFails(
      setDoc(
        friendshipRef(db, 'alice', 'missing-user'),
        friendshipData('alice', 'missing-user'),
      ),
    )
  })

  it('denies creating an already accepted friendship', async () => {
    const db = userDb('alice')

    await assertFails(
      setDoc(
        friendshipRef(db),
        friendshipData('alice', 'bob', {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
        }),
      ),
    )
  })

  it('prevents a reversed duplicate friendship', async () => {
    await createPendingFriendship('alice', 'bob')

    const bobDb = userDb('bob')

    await assertFails(
      setDoc(
        friendshipRef(bobDb, 'bob', 'alice'),
        friendshipData('bob', 'alice'),
      ),
    )
  })

  it('allows both participants to read the friendship', async () => {
    await createPendingFriendship()

    await assertSucceeds(
      getDoc(
        friendshipRef(userDb('alice')),
      ),
    )

    await assertSucceeds(
      getDoc(
        friendshipRef(userDb('bob')),
      ),
    )
  })

  it('denies friendship reads to unrelated users', async () => {
    await createPendingFriendship()

    await assertFails(
      getDoc(
        friendshipRef(userDb('charlie')),
      ),
    )
  })

  it('allows a participant to query only their friendships', async () => {
    await createPendingFriendship()

    const db = userDb('alice')

    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'friendships'),
          where('members', 'array-contains', 'alice'),
        ),
      ),
    )
  })

  it('denies listing friendships without a member constraint', async () => {
    await createPendingFriendship()

    await assertFails(
      getDocs(
        collection(
          userDb('alice'),
          'friendships',
        ),
      ),
    )
  })

  it('denies querying another users friendships', async () => {
    await createPendingFriendship()

    const db = userDb('charlie')

    await assertFails(
      getDocs(
        query(
          collection(db, 'friendships'),
          where('members', 'array-contains', 'alice'),
        ),
      ),
    )
  })

  it('denies the requester accepting their own request', async () => {
    await createPendingFriendship()

    const db = userDb('alice')

    await assertFails(
      updateDoc(
        friendshipRef(db),
        {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    )
  })

  it('allows only the recipient to accept a pending request', async () => {
    await createPendingFriendship()

    const db = userDb('bob')

    await assertSucceeds(
      updateDoc(
        friendshipRef(db),
        {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    )

    const snapshot = await assertSucceeds(
      getDoc(friendshipRef(db)),
    )

    assert.equal(snapshot.data().status, 'accepted')
    assert.ok(snapshot.data().acceptedAt instanceof Timestamp)
  })

  it('denies tampering with friendship identity while accepting', async () => {
    await createPendingFriendship()

    const db = userDb('bob')

    await assertFails(
      updateDoc(
        friendshipRef(db),
        {
          requestedBy: 'bob',
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    )
  })

  it('denies reverting an accepted friendship to pending', async () => {
    await createPendingFriendship()

    const bobDb = userDb('bob')

    await assertSucceeds(
      updateDoc(
        friendshipRef(bobDb),
        {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    )

    const aliceDb = userDb('alice')

    await assertFails(
      updateDoc(
        friendshipRef(aliceDb),
        {
          status: 'pending',
          acceptedAt: null,
          updatedAt: serverTimestamp(),
        },
      ),
    )
  })

  it('allows the requester to cancel a pending request', async () => {
    await createPendingFriendship()

    const db = userDb('alice')

    await assertSucceeds(
      deleteDoc(friendshipRef(db)),
    )
  })

  it('allows the recipient to decline a pending request', async () => {
    await createPendingFriendship()

    const db = userDb('bob')

    await assertSucceeds(
      deleteDoc(friendshipRef(db)),
    )
  })

  it('denies unrelated users deleting a friendship', async () => {
    await createPendingFriendship()

    const db = userDb('charlie')

    await assertFails(
      deleteDoc(friendshipRef(db)),
    )
  })

  it('allows either participant to unfriend after acceptance', async () => {
    await createPendingFriendship()

    const bobDb = userDb('bob')

    await assertSucceeds(
      updateDoc(
        friendshipRef(bobDb),
        {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    )

    await assertSucceeds(
      deleteDoc(
        friendshipRef(userDb('alice')),
      ),
    )
  })
})

describe('Stage 12 private profile friend access', { concurrency: false }, () => {
  let privateAccessEnv

  function previewFriendshipId(first, second) {
    const members = [first, second].sort()

    return createHash('sha256')
      .update(`${members[0]}:${members[1]}`, 'utf8')
      .digest('hex')
      .toUpperCase()
  }

  function privateUserDb(uid) {
    return privateAccessEnv
      .authenticatedContext(uid)
      .firestore()
  }

  async function seedPrivatePreview({
    friendshipStatus = null,
    requestedBy = 'alice',
  } = {}) {
    await privateAccessEnv.withSecurityRulesDisabled(
      async (context) => {
        const firestore = context.firestore()

        await setDoc(
          doc(firestore, 'publicProfiles', 'alice'),
          {
            profileVisibility: 'private',
          },
        )

        await setDoc(
          doc(
            firestore,
            'publicProfilePreviews',
            'alice',
          ),
          {
            schemaVersion: 1,
            dna: {
              genres: [],
            },
            statistics: {
              totalViewings: 0,
              movieCount: 0,
              tvCount: 0,
            },
            updatedAt: new Date(),
          },
        )

        if (friendshipStatus) {
          await setDoc(
            doc(
              firestore,
              'friendships',
              previewFriendshipId(
                'alice',
                'bob',
              ),
            ),
            {
              members: ['alice', 'bob'],
              requestedBy,
              status: friendshipStatus,
            },
          )
        }
      },
    )
  }

  before(async () => {
    privateAccessEnv =
      await initializeTestEnvironment({
        projectId,
        firestore: {
          host: '127.0.0.1',
          port: 8080,
          rules: await readFile(
            new URL(
              '../firestore.rules',
              import.meta.url,
            ),
            'utf8',
          ),
        },
      })
  })

  beforeEach(async () => {
    await privateAccessEnv.clearFirestore()
  })

  after(async () => {
    await privateAccessEnv.cleanup()
  })

  it('allows an accepted friend to read a private profile preview', async () => {
    await seedPrivatePreview({
      friendshipStatus: 'accepted',
    })

    await assertSucceeds(
      getDoc(
        doc(
          privateUserDb('bob'),
          'publicProfilePreviews',
          'alice',
        ),
      ),
    )
  })

  it('does not grant private preview access to the outgoing requester while pending', async () => {
    await seedPrivatePreview({
      friendshipStatus: 'pending',
      requestedBy: 'bob',
    })

    await assertFails(
      getDoc(
        doc(
          privateUserDb('bob'),
          'publicProfilePreviews',
          'alice',
        ),
      ),
    )
  })

  it('does not grant private preview access to the recipient while pending', async () => {
    await seedPrivatePreview({
      friendshipStatus: 'pending',
      requestedBy: 'alice',
    })

    await assertFails(
      getDoc(
        doc(
          privateUserDb('bob'),
          'publicProfilePreviews',
          'alice',
        ),
      ),
    )
  })

  it('revokes private preview access after friendship removal', async () => {
    await seedPrivatePreview({
      friendshipStatus: 'accepted',
    })

    const previewRef = doc(
      privateUserDb('bob'),
      'publicProfilePreviews',
      'alice',
    )

    await assertSucceeds(
      getDoc(previewRef),
    )

    await privateAccessEnv.withSecurityRulesDisabled(
      async (context) => {
        await deleteDoc(
          doc(
            context.firestore(),
            'friendships',
            previewFriendshipId(
              'alice',
              'bob',
            ),
          ),
        )
      },
    )

    await assertFails(
      getDoc(previewRef),
    )
  })
})
