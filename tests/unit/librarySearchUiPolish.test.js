import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('library and search UI polish', () => {
  it('keeps library card titles at a stable two-line height', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/library/components/SavedMediaCard.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /line-clamp-2 min-h-12/,
    )

    assert.match(
      source,
      /truncate text-sm text-secondary/,
    )
  })

  it('keeps public board cards aligned too', async () => {
    const source = await readFile(
      new URL(
        '../../src/pages/PublicBoardPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /line-clamp-2 min-h-12/,
    )
  })

  it('shows movie and TV artwork in autocomplete suggestions', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/catalog/components/SearchForm.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /getTmdbPosterUrl/,
    )

    assert.match(
      source,
      /suggestionArtwork/,
    )

    assert.match(
      source,
      /item\.posterPath/,
    )

    assert.match(
      source,
      /h-\[66px\] w-11/,
    )
  })
})
