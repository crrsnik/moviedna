import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  normalizePublicBoard,
  normalizePublicBoardItem,
} from '../../src/features/profile/services/normalizePublicBoards.js'

const LIST_ID = 'A'.repeat(20)

const timestamp = value => ({
  toDate: () => new Date(value),
})

const snapshot = (id, data) => ({
  id,
  exists: () => true,
  data: () => data,
})

describe('public boards UI contract', () => {
  it('normalizes only safe public board metadata', () => {
    const board = normalizePublicBoard(
      snapshot(
        LIST_ID,
        {
          schemaVersion: 1,
          ownerId: 'alice',
          listId: LIST_ID,
          name: ' Film night ',
          description: ' Friends ',
          createdAt: timestamp(
            '2026-01-01T00:00:00.000Z',
          ),
          updatedAt: timestamp(
            '2026-01-02T00:00:00.000Z',
          ),
        },
      ),
      'alice',
    )

    assert.equal(board.name, 'Film night')
    assert.equal(board.description, 'Friends')
    assert.equal('visibility' in board, false)
  })

  it('normalizes only safe public media fields', () => {
    const item = normalizePublicBoardItem(
      snapshot(
        'movie_42',
        {
          schemaVersion: 1,
          tmdbId: 42,
          mediaType: 'movie',
          title: 'Synthetic movie',
          posterPath: null,
          releaseYear: 2020,
          updatedAt: timestamp(
            '2026-01-02T00:00:00.000Z',
          ),
        },
      ),
    )

    assert.deepEqual(
      Object.keys(item).sort(),
      [
        'key',
        'mediaType',
        'posterPath',
        'releaseYear',
        'title',
        'tmdbId',
        'updatedAt',
      ].sort(),
    )
  })

  it('rejects leaked private media fields', () => {
    assert.throws(
      () => normalizePublicBoardItem(
        snapshot(
          'movie_42',
          {
            schemaVersion: 1,
            tmdbId: 42,
            mediaType: 'movie',
            title: 'Synthetic movie',
            posterPath: null,
            releaseYear: 2020,
            watched: true,
            updatedAt: timestamp(
              '2026-01-02T00:00:00.000Z',
            ),
          },
        ),
      ),
      /invalid-public-board-item/,
    )
  })

  it('lets owners choose private or public visibility', async () => {
    const form = await readFile(
      new URL(
        '../../src/features/library/components/CustomListForm.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      form,
      /setVisibility\('private'\)/,
    )

    assert.match(
      form,
      /setVisibility\('public'\)/,
    )

    assert.match(
      form,
      /visibility === 'public'/,
    )
  })

  it('loads boards only through the permitted profile UID', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/PublicProfilePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      page,
      /usePublicBoards\(previewUid\)/,
    )

    assert.match(
      page,
      /boardsState=\{boardsState\}/,
    )
  })

  it('keeps public board cards read-only', async () => {
    const component = await readFile(
      new URL(
        '../../src/features/profile/components/PublicBoards.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.doesNotMatch(
      component,
      /mediaLibraryService/,
    )

    assert.doesNotMatch(
      component,
      /removeMediaFromCustomList/,
    )

    assert.match(
      component,
      /savedMediaRoute/,
    )
  })
})
