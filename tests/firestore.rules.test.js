import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp,
  setDoc, Timestamp, updateDoc, writeBatch,
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
