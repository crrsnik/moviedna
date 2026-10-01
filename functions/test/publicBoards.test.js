import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildPublicBoard,
  buildPublicBoardItem,
  createPublicBoardHandlers,
} from '../src/publicBoards/publicBoards.js'

const LIST_A = 'A'.repeat(20)
const LIST_B = 'B'.repeat(20)

function timestamp(seconds = 1) {
  return {
    seconds,
    nanoseconds: 0,
  }
}

function list(overrides = {}) {
  return {
    name: 'Favorites with friends',
    description: 'Public picks',
    visibility: 'public',
    createdAt: timestamp(),
    updatedAt: timestamp(2),
    ...overrides,
  }
}

function media(overrides = {}) {
  return {
    tmdbId: 42,
    mediaType: 'movie',
    title: 'Synthetic movie',
    posterPath: '/poster.jpg',
    releaseYear: 2020,
    favorite: true,
    watchlist: true,
    watched: true,
    listIds: [LIST_A],
    createdAt: timestamp(),
    updatedAt: timestamp(2),
    ...overrides,
  }
}

function snapshot(data) {
  return {
    data: () => data,
  }
}

describe('public board projection', () => {
  it('exposes only safe board metadata', () => {
    assert.deepEqual(
      buildPublicBoard(
        'alice',
        LIST_A,
        {
          ...list(),
          secret: 'private',
        },
      ),
      {
        schemaVersion: 1,
        ownerId: 'alice',
        listId: LIST_A,
        name: 'Favorites with friends',
        description: 'Public picks',
        createdAt: timestamp(),
      },
    )
  })

  it('exposes only safe media snapshot fields', () => {
    const result = buildPublicBoardItem(
      'movie_42',
      media(),
    )

    assert.deepEqual(result, {
      schemaVersion: 1,
      tmdbId: 42,
      mediaType: 'movie',
      title: 'Synthetic movie',
      posterPath: '/poster.jpg',
      releaseYear: 2020,
    })

    for (const field of [
      'favorite',
      'watchlist',
      'watched',
      'listIds',
      'createdAt',
    ]) {
      assert.equal(field in result, false)
    }
  })

  it('rebuilds a public board from current private state', async () => {
    const calls = []

    const handlers = createPublicBoardHandlers({
      loadList: async () => list(),
      loadListItems: async () => [
        {
          id: 'movie_42',
          ...media(),
        },
      ],
      replaceBoard: async (...args) => {
        calls.push(args)
      },
    })

    const result = await handlers.customListWrite({
      params: {
        uid: 'alice',
        listId: LIST_A,
      },
    })

    assert.deepEqual(result, {
      status: 'published',
      itemCount: 1,
    })

    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], 'alice')
    assert.equal(calls[0][1], LIST_A)

    assert.equal(
      calls[0][2].name,
      'Favorites with friends',
    )

    assert.deepEqual(calls[0][3], [
      {
        mediaKey: 'movie_42',
        value: {
          schemaVersion: 1,
          tmdbId: 42,
          mediaType: 'movie',
          title: 'Synthetic movie',
          posterPath: '/poster.jpg',
          releaseYear: 2020,
        },
      },
    ])
  })

  it('removes projection when current list is private', async () => {
    const deleted = []

    const handlers = createPublicBoardHandlers({
      loadList: async () => list({
        visibility: 'private',
      }),
      deleteBoard: async (...args) => {
        deleted.push(args)
      },
    })

    const result = await handlers.customListWrite({
      params: {
        uid: 'alice',
        listId: LIST_A,
      },
    })

    assert.deepEqual(result, {
      status: 'private',
    })

    assert.deepEqual(deleted, [
      ['alice', LIST_A],
    ])
  })

  it('uses current savedMedia state for delayed events', async () => {
    const writes = []
    const deletes = []

    const current = media({
      listIds: [LIST_B],
      title: 'Current title',
    })

    const handlers = createPublicBoardHandlers({
      loadSavedMedia: async () => current,
      loadList: async (_uid, id) => list({
        name: id,
      }),
      writeItem: async (...args) => {
        writes.push(args)
      },
      deleteItem: async (...args) => {
        deletes.push(args)
      },
    })

    const result = await handlers.savedMediaWrite({
      params: {
        uid: 'alice',
        mediaKey: 'movie_42',
      },
      data: {
        before: snapshot(media({
          listIds: [LIST_A],
        })),
        after: snapshot(media({
          listIds: [LIST_A, LIST_B],
        })),
      },
    })

    assert.deepEqual(result, {
      status: 'updated',
      updates: 2,
    })

    assert.deepEqual(deletes, [
      ['alice', LIST_A, 'movie_42'],
    ])

    assert.equal(writes.length, 1)
    assert.equal(writes[0][1], LIST_B)
    assert.equal(
      writes[0][3].title,
      'Current title',
    )
  })

  it('does not expose media into private boards', async () => {
    const calls = []

    const handlers = createPublicBoardHandlers({
      loadSavedMedia: async () => media(),
      loadList: async () => list({
        visibility: 'private',
      }),
      writeItem: async (...args) => {
        calls.push(args)
      },
      deleteItem: async (...args) => {
        calls.push(args)
      },
    })

    const result = await handlers.savedMediaWrite({
      params: {
        uid: 'alice',
        mediaKey: 'movie_42',
      },
      data: {
        before: snapshot(media({
          listIds: [],
        })),
        after: snapshot(media({
          listIds: [LIST_A],
        })),
      },
    })

    assert.deepEqual(result, {
      status: 'unchanged',
      updates: 0,
    })

    assert.deepEqual(calls, [])
  })

  it('ignores savedMedia events without list memberships', async () => {
    const handlers = createPublicBoardHandlers({})

    const result = await handlers.savedMediaWrite({
      params: {
        uid: 'alice',
        mediaKey: 'movie_42',
      },
      data: {
        before: snapshot(media({
          listIds: [],
        })),
        after: snapshot(media({
          listIds: [],
        })),
      },
    })

    assert.deepEqual(result, {
      status: 'unchanged',
    })
  })
})
