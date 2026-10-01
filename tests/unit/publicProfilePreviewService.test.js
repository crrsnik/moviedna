import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const key = '__moviednaPublicProfilePreviewServiceTest'

const db = {}
let server
let getPublicProfilePreview
let calls
let response

const stubs = {
  db,

  doc(_db, ...path) {
    const ref = path.join('/')
    calls.push(['doc', ref])
    return ref
  },

  async getDoc(ref) {
    calls.push(['getDoc', ref])

    if (response?.throw) throw response.throw

    return response
  },
}

function timestamp(value = '2026-10-01T10:00:00.000Z') {
  return {
    toDate() {
      return new Date(value)
    },
  }
}

function snapshot(data, exists = true) {
  return {
    exists: () => exists,
    data: () => data,
  }
}

describe('public profile preview service', { concurrency: false }, () => {
  before(async () => {
    globalThis[key] = stubs

    server = await createServer({
      configFile: false,
      envFile: false,
      logLevel: 'silent',
      server: { middlewareMode: true },
      ssr: { noExternal: true },
      plugins: [{
        name: 'public-profile-preview-test-firebase-boundaries',
        enforce: 'pre',

        resolveId(source, importer) {
          if (!importer?.endsWith('/publicProfilePreviewService.js')) return

          if (source === 'firebase/firestore') return '\0mock:firestore'

          if (source === '../../../shared/config/firebase.js') {
            return '\0mock:config'
          }
        },

        load(id) {
          if (id === '\0mock:firestore') {
            return `export const { doc, getDoc } = globalThis.${key}`
          }

          if (id === '\0mock:config') {
            return `export const db = globalThis.${key}.db`
          }
        },
      }],
    })

    getPublicProfilePreview = (
      await server.ssrLoadModule(
        '/src/features/profile/services/publicProfilePreviewService.js',
      )
    ).getPublicProfilePreview
  })

  beforeEach(() => {
    calls = []

    response = snapshot({
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

      updatedAt: timestamp(),
    })
  })

  after(async () => {
    await server?.close()
    delete globalThis[key]
  })

  it('loads and normalizes the safe preview', async () => {
    const result = await getPublicProfilePreview('alice')

    assert.deepEqual(result, {
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

      updatedAt: '2026-10-01T10:00:00.000Z',
    })

    assert.deepEqual(calls, [
      ['doc', 'publicProfilePreviews/alice'],
      ['getDoc', 'publicProfilePreviews/alice'],
    ])
  })

  it('normalizes legacy numeric genre labels', async () => {
    response = snapshot({
      schemaVersion: 1,

      dna: {
        genres: [
          {
            label: '18',
            score: 0.8,
          },
          {
            label: '28',
            score: 0.7,
          },
          {
            label: '878',
            score: 0.6,
          },
        ],
      },

      statistics: {
        totalViewings: 3,
        movieCount: 2,
        tvCount: 1,
      },

      updatedAt: timestamp(),
    })

    const result = await getPublicProfilePreview('alice')

    assert.deepEqual(result.dna.genres, [
      {
        label: 'Drama',
        score: 0.8,
      },
      {
        label: 'Action',
        score: 0.7,
      },
      {
        label: 'Science Fiction',
        score: 0.6,
      },
    ])
  })

  it('returns null when no preview exists', async () => {
    response = snapshot(null, false)

    assert.equal(
      await getPublicProfilePreview('alice'),
      null,
    )
  })

  it('rejects invalid aggregate totals', async () => {
    response = snapshot({
      schemaVersion: 1,
      dna: { genres: [] },
      statistics: {
        totalViewings: 5,
        movieCount: 2,
        tvCount: 1,
      },
      updatedAt: timestamp(),
    })

    await assert.rejects(
      getPublicProfilePreview('alice'),
      {
        code: 'public-profile-preview/invalid',
      },
    )
  })

  it('rejects unsafe UIDs before Firestore access', async () => {
    await assert.rejects(
      getPublicProfilePreview('alice/path'),
      {
        code: 'public-profile-preview/invalid-user',
      },
    )

    assert.deepEqual(calls, [])
  })

  it('sanitizes permission errors', async () => {
    response = {
      throw: {
        code: 'permission-denied',
      },
    }

    await assert.rejects(
      getPublicProfilePreview('alice'),
      {
        code: 'public-profile-preview/permission-denied',
      },
    )
  })
})
