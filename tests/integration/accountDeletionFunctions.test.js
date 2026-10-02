import assert from 'node:assert/strict'
import {
  after,
  describe,
  it,
} from 'node:test'
import {
  createRequire,
} from 'node:module'

const projectId = 'demo-moviedna'

const authHost = (
  process.env.FIREBASE_AUTH_EMULATOR_HOST
)

const firestoreHost = (
  process.env.FIRESTORE_EMULATOR_HOST
)

if (
  ![
    '127.0.0.1:9099',
    'localhost:9099',
  ].includes(authHost)
  || ![
    '127.0.0.1:8080',
    'localhost:8080',
  ].includes(firestoreHost)
  || process.env.GCLOUD_PROJECT !== projectId
) {
  throw new Error(
    'Run through the local MovieDNA Firebase Emulators.',
  )
}

/*
 * Resolve Admin SDK from the Functions package so the
 * root application does not gain a production dependency
 * on firebase-admin.
 */
const functionsRequire = createRequire(
  new URL(
    '../../functions/package.json',
    import.meta.url,
  ),
)

const {
  deleteApp,
  getApps,
  initializeApp,
} = functionsRequire('firebase-admin/app')

const {
  getAuth,
} = functionsRequire('firebase-admin/auth')

const {
  getFirestore,
  Timestamp,
} = functionsRequire(
  'firebase-admin/firestore',
)

const app = (
  getApps().find(
    candidate => (
      candidate.name === 'account-deletion-test'
    ),
  )
  ?? initializeApp(
    {
      projectId,
    },
    'account-deletion-test',
  )
)

const auth = getAuth(app)
const db = getFirestore(app)

after(async () => {
  await deleteApp(app)
})

const uid = 'delete-account-user'
const email = 'delete-account@example.test'
const password = 'Deletion-Test-123!'
const username = 'delete_account_user'

const listId = 'A'.repeat(20)
const mediaKey = 'movie_42'

function delay(milliseconds) {
  return new Promise(
    resolve => setTimeout(
      resolve,
      milliseconds,
    ),
  )
}

async function signIn() {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()

    assert.fail(
      `Auth Emulator sign-in failed: ${response.status} ${body}`,
    )
  }

  return response.json()
}

async function callDeleteAccount(idToken) {
  const response = await fetch(
    `http://127.0.0.1:5001/${projectId}/europe-west6/deleteAccount`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          confirm: true,
        },
      }),
    },
  )

  const body = await response.json()

  assert.equal(
    response.status,
    200,
    JSON.stringify(body),
  )

  assert.deepEqual(
    body.result,
    {
      deleted: true,
    },
  )
}

async function exists(reference) {
  return (
    await reference.get()
  ).exists
}

describe(
  'deleteAccount Firebase Emulator integration',
  {
    concurrency: false,
  },
  () => {
    it(
      'removes Auth and every user-owned data surface',
      async () => {
        await auth.createUser({
          uid,
          email,
          password,
          emailVerified: true,
        })

        const now = Timestamp.now()

        const user = db
          .collection('users')
          .doc(uid)

        const publicBoards = db
          .collection('publicBoards')
          .doc(uid)

        const friendship = db
          .collection('friendships')
          .doc('DELETE_TEST_PAIR')

        const unrelatedFriendship = db
          .collection('friendships')
          .doc('UNRELATED_PAIR')

        const ownComment = db
          .collection('mediaComments')
          .doc(mediaKey)
          .collection('comments')
          .doc(uid)

        const unrelatedComment = db
          .collection('mediaComments')
          .doc(mediaKey)
          .collection('comments')
          .doc('other-user')

        const batch = db.batch()

        batch.set(
          user,
          {
            username,
            displayName: 'Delete Test',
            photoURL: null,
            bio: '',
            avatarId: 'avatar_01',
            profileVisibility: 'public',
            onboardingCompleted: true,
            createdAt: now,
            updatedAt: now,
          },
        )

        batch.set(
          user
            .collection('ratings')
            .doc(mediaKey),
          {
            synthetic: true,
          },
        )

        batch.set(
          user
            .collection('savedMedia')
            .doc(mediaKey),
          {
            synthetic: true,
          },
        )

        batch.set(
          user
            .collection(
              'onboardingResponses',
            )
            .doc('42'),
          {
            synthetic: true,
          },
        )

        batch.set(
          user
            .collection('onboarding')
            .doc('summary'),
          {
            synthetic: true,
          },
        )

        batch.set(
          user
            .collection('lists')
            .doc(listId),
          {
            synthetic: true,
          },
        )

        batch.set(
          user
            .collection('viewingHistory')
            .doc('history-entry'),
          {
            synthetic: true,
          },
        )

        batch.set(
          user
            .collection('movieDna')
            .doc('current'),
          {
            synthetic: true,
          },
        )

        batch.set(
          user
            .collection('movieDna')
            .doc('recalculation'),
          {
            synthetic: true,
          },
        )

        batch.set(
          db
            .collection('usernames')
            .doc(username),
          {
            userId: uid,
            createdAt: now,
          },
        )

        batch.set(
          db
            .collection('publicProfiles')
            .doc(uid),
          {
            userId: uid,
            username,
          },
        )

        batch.set(
          db
            .collection(
              'publicProfilePreviews',
            )
            .doc(uid),
          {
            synthetic: true,
          },
        )

        batch.set(
          publicBoards,
          {
            synthetic: true,
          },
        )

        batch.set(
          publicBoards
            .collection('boards')
            .doc(listId),
          {
            synthetic: true,
          },
        )

        batch.set(
          publicBoards
            .collection('boards')
            .doc(listId)
            .collection('items')
            .doc(mediaKey),
          {
            synthetic: true,
          },
        )

        batch.set(
          friendship,
          {
            members: [
              uid,
              'other-user',
            ],
          },
        )

        batch.set(
          unrelatedFriendship,
          {
            members: [
              'other-user',
              'third-user',
            ],
          },
        )

        batch.set(
          ownComment,
          {
            synthetic: true,
          },
        )

        batch.set(
          unrelatedComment,
          {
            synthetic: true,
          },
        )

        await batch.commit()

        const login = await signIn()

        assert.equal(
          typeof login.idToken,
          'string',
        )

        await callDeleteAccount(
          login.idToken,
        )

        /*
         * Give background Firestore triggers time to
         * process deletion events. The account-existence
         * guard must prevent them from recreating data.
         */
        await delay(1500)

        await assert.rejects(
          auth.getUser(uid),
          error => (
            error?.code
            === 'auth/user-not-found'
          ),
        )

        assert.equal(
          await exists(user),
          false,
        )

        for (const reference of [
          user
            .collection('ratings')
            .doc(mediaKey),

          user
            .collection('savedMedia')
            .doc(mediaKey),

          user
            .collection(
              'onboardingResponses',
            )
            .doc('42'),

          user
            .collection('onboarding')
            .doc('summary'),

          user
            .collection('lists')
            .doc(listId),

          user
            .collection('viewingHistory')
            .doc('history-entry'),

          user
            .collection('movieDna')
            .doc('current'),

          user
            .collection('movieDna')
            .doc('recalculation'),

          db
            .collection('usernames')
            .doc(username),

          db
            .collection('publicProfiles')
            .doc(uid),

          db
            .collection(
              'publicProfilePreviews',
            )
            .doc(uid),

          publicBoards,

          publicBoards
            .collection('boards')
            .doc(listId),

          publicBoards
            .collection('boards')
            .doc(listId)
            .collection('items')
            .doc(mediaKey),

          friendship,

          ownComment,
        ]) {
          assert.equal(
            await exists(reference),
            false,
            `Expected deletion of ${reference.path}`,
          )
        }

        /*
         * Account deletion must not damage another
         * user's social data or comment.
         */
        assert.equal(
          await exists(
            unrelatedFriendship,
          ),
          true,
        )

        assert.equal(
          await exists(
            unrelatedComment,
          ),
          true,
        )

        assert.deepEqual(
          await user.listCollections(),
          [],
        )

        assert.deepEqual(
          await publicBoards.listCollections(),
          [],
        )
      },
    )
  },
)
