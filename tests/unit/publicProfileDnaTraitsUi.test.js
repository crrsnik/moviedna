import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('public profile DNA traits UI', () => {
  it('renders diverse public DNA traits instead of genre-only preview', async () => {
    const source = await readFile(
      new URL(
        '../../src/pages/PublicProfilePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /function DnaPreview\(\{ traits \}\)/,
    )

    assert.match(
      source,
      /publicDnaTraits\(dna\)/,
    )

    assert.match(
      source,
      /trait\.dimension/,
    )

    assert.match(
      source,
      /resolveDimensionLabel/,
    )

    assert.doesNotMatch(
      source,
      /function GenrePreview/,
    )
  })

  it('accepts optional public DNA trait projection', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/profile/services/publicProfilePreviewService.js',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /PUBLIC_DNA_DIMENSIONS/,
    )

    assert.match(
      source,
      /normalizePublicDnaTrait/,
    )

    assert.match(
      source,
      /data\.dna\.traits/,
    )
  })
})
