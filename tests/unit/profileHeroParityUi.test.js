import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('profile hero and DNA preview parity', () => {
  it('keeps Taste Title in the hero instead of the own-profile name row', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/profile/components/ProfileLayout.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /profile\.tasteTitleLabel/,
    )

    assert.match(
      source,
      /absolute right-7 top-1\/2/,
    )

    assert.match(
      source,
      /sm:pr-56/,
    )
  })

  it('shows public profile visibility and Taste Title in the public hero', async () => {
    const source = await readFile(
      new URL(
        '../../src/pages/PublicProfilePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /visibility=\{result\.kind\}/,
    )

    assert.match(
      source,
      /profile\.publicProfile/,
    )

    assert.match(
      source,
      /profile\.privateProfile/,
    )

    assert.match(
      source,
      /profile\.tasteTitleLabel/,
    )

    assert.match(
      source,
      /previewState\.preview\?\.dna\?\.tasteTitle/,
    )
  })

  it('uses the current DNA bar design and keeps Taste Title out of the DNA section', async () => {
    const source = await readFile(
      new URL(
        '../../src/pages/PublicProfilePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /<DnaTraitBar/,
    )

    assert.doesNotMatch(
      source,
      /<progress/,
    )

    const publicPreview = source.slice(
      source.indexOf('function PublicPreview'),
      source.indexOf(
        'export default function PublicProfilePage',
      ),
    )

    assert.doesNotMatch(
      publicPreview,
      /dna\.tasteTitle/,
    )
  })
})
