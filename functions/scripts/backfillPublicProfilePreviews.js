import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  createFirestorePublicProfilePreviewStore,
} from '../src/profilePreview/firestorePublicProfilePreviewStore.js'
import {
  rebuildPublicProfilePreview,
} from '../src/profilePreview/publicProfilePreview.js'

export async function backfillPublicProfilePreviews({
  db,
  dryRun = true,
  createStore = createFirestorePublicProfilePreviewStore,
}) {
  const snapshot = await db
    .collection('publicProfiles')
    .get()

  const sourceStore = createStore(db)

  const store = dryRun
    ? {
        ...sourceStore,
        writePreview: async () => {},
      }
    : sourceStore

  let rebuilt = 0

  for (const document of snapshot.docs) {
    await rebuildPublicProfilePreview(
      store,
      document.id,
    )

    rebuilt += 1
  }

  return {
    dryRun,
    scanned: snapshot.docs.length,
    rebuilt,
  }
}

async function main() {
  const args = process.argv.slice(2)

  const projectArgument = args.find(
    (argument) => argument.startsWith('--project='),
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
    throw new Error('Firebase project ID cannot be empty.')
  }

  const write = args.includes('--write')

  if (!getApps().length) {
    initializeApp({
      projectId,
    })
  }

  const result = await backfillPublicProfilePreviews({
    db: getFirestore(),
    dryRun: !write,
  })

  console.log(JSON.stringify({
    projectId,
    ...result,
  }, null, 2))

  if (!write) {
    console.log(
      'Dry run only. No preview documents were written.',
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
