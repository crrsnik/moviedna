import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

describe('future movie viewing UI', () => {
  it('hides viewing history action for unreleased movies', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/viewingHistory/components/MediaViewingHistoryAction.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /function isFutureMovie/,
    )

    assert.match(
      source,
      /mediaType !== 'movie'/,
    )

    assert.match(
      source,
      /detail\.releaseDate/,
    )

    assert.match(
      source,
      /> localDateString\(\)/,
    )

    assert.match(
      source,
      /isFutureMovie\(\{/,
    )
  })
})
