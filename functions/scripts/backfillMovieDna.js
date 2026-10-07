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
  createMetadataResolver,
} from '../src/metadata/metadataCache.js'

import {
  createTmdbClient,
} from '../src/metadata/tmdbClient.js'

import {
  createRecalculationRunner,
} from '../src/runner/recalculationRunner.js'

function createBackfillRunner({
  db,
  token,
  dryRun,
  fetchImpl,
}) {
  const sourceStore = createFirestoreAdapter(db)

  const cache = dryRun
    ? {
        ...sourceStore.cache,
        set: async () => {},
      }
    : sourceStore.cache

  const store = dryRun
    ? {
        ...sourceStore,

        beginRun: async () => {},

        finishRun: async () => false,

        failRun: async () => {},
      }
    : sourceStore

  const tmdbClient = createTmdbClient({
    token,
    fetchImpl,
  })

  const metadataResolver = createMetadataResolver({
    cache,
    tmdbClient,
  })

  return createRecalculationRunner({
    store,
    metadataResolver,
  })
}

export async function backfillMovieDna({
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
  let failed = 0
  const failures = []

  for (const document of users.docs) {
    try {
      await run(document.id)
      rebuilt += 1
    } catch (error) {
      failed += 1

      failures.push({
        uid: document.id,
        code: error?.code ?? null,
        message:
          typeof error?.message === 'string'
            ? error.message
            : String(error),
      })
    }
  }

  return {
    dryRun,
    scanned: users.docs.length,
    rebuilt,
    failed,
    failures,
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

  const token =
    process.env.TMDB_READ_ACCESS_TOKEN

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

  const result = await backfillMovieDna({
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
      'Dry run only. No MovieDNA or metadata documents were written.',
    )
  }

  if (result.failed > 0) {
    process.exitCode = 1
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
