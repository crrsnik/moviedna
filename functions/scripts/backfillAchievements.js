import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  getApps,
  initializeApp,
} from 'firebase-admin/app'

import {
  getFirestore,
} from 'firebase-admin/firestore'

import {
  createFirestoreAdapter,
} from '../src/adapters/firestoreAdapter.js'

import {
  createAchievementRunner,
} from '../src/achievements/achievementRunner.js'

import {
  createFirestoreAchievementStore,
} from '../src/achievements/firestoreAchievementStore.js'

import {
  createMetadataResolver,
} from '../src/metadata/metadataCache.js'

import {
  createTmdbClient,
} from '../src/metadata/tmdbClient.js'

function createBackfillRunner({
  db,
  token,
  dryRun,
  fetchImpl,
}) {
  const sourceAchievementStore =
    createFirestoreAchievementStore(db)

  const achievementStore = dryRun
    ? {
        ...sourceAchievementStore,

        saveCurrent: async (
          uid,
          evaluation,
        ) => ({
          status: 'dry-run',
          uid,
          completedCount:
            evaluation.completedCount,
          totalCount:
            evaluation.totalCount,
        }),
      }
    : sourceAchievementStore

  const dnaStore = createFirestoreAdapter(db)

  const cache = dryRun
    ? {
        ...dnaStore.cache,
        set: async () => {},
      }
    : dnaStore.cache

  const tmdbClient = createTmdbClient({
    token,
    fetchImpl,
  })

  const metadataResolver = createMetadataResolver({
    cache,
    tmdbClient,
  })

  return createAchievementRunner({
    store: achievementStore,
    metadataResolver,
  })
}

export async function backfillAchievements({
  db,
  token,
  dryRun = true,
  fetchImpl = globalThis.fetch,
  createRunner = createBackfillRunner,
}) {
  const users = await db
    .collection('users')
    .get()

  const run = createRunner({
    db,
    token,
    dryRun,
    fetchImpl,
  })

  let rebuilt = 0

  for (const document of users.docs) {
    await run(document.id)
    rebuilt += 1
  }

  return {
    dryRun,
    scanned: users.docs.length,
    rebuilt,
  }
}

async function main() {
  const args = process.argv.slice(2)

  const projectArgument = args.find(
    argument => argument.startsWith('--project='),
  )

  if (!projectArgument) {
    throw new Error(
      'Explicit --project=<firebase-project-id> is required.',
    )
  }

  const projectId = projectArgument.slice(
    '--project='.length,
  )

  if (!projectId) {
    throw new Error(
      'Firebase project ID cannot be empty.',
    )
  }

  const token = process.env.TMDB_READ_ACCESS_TOKEN

  if (
    typeof token !== 'string'
    || !token.trim()
  ) {
    throw new Error(
      'TMDB_READ_ACCESS_TOKEN environment variable is required.',
    )
  }

  const write = args.includes('--write')

  if (!getApps().length) {
    initializeApp({
      projectId,
    })
  }

  const result = await backfillAchievements({
    db: getFirestore(),
    token: token.trim(),
    dryRun: !write,
  })

  console.log(
    JSON.stringify(
      {
        projectId,
        ...result,
      },
      null,
      2,
    ),
  )

  if (!write) {
    console.log(
      'Dry run only. No achievement or metadata documents were written.',
    )
  }
}

const isMain = (
  process.argv[1]
  && fileURLToPath(import.meta.url)
    === resolve(process.argv[1])
)

if (isMain) {
  await main()
}
