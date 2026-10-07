import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('profile hero and DNA preview parity', () => {
  it('uses Taste Title instead of privacy status in the own profile hero', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/profile/components/ProfileLayout.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /TasteTitleBadge/,
    )

    assert.match(
      source,
      /className="hidden sm:inline-flex"/,
    )

    assert.doesNotMatch(
      source,
      /profile\.publicProfile/,
    )

    assert.doesNotMatch(
      source,
      /profile\.privateProfile/,
    )

    assert.doesNotMatch(
      source,
      /bottom-5 right-6/,
    )

    assert.doesNotMatch(
      source,
      /sm:pr-44/,
    )
  })

  it('uses Taste Title instead of privacy status in the public profile hero', async () => {
    const source = await readFile(
      new URL(
        '../../src/pages/PublicProfilePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    const identity = source.slice(
      source.indexOf(
        'function ProfileIdentity',
      ),
      source.indexOf(
        'function GenrePreview',
      ),
    )

    assert.match(
      identity,
      /TasteTitleBadge/,
    )

    assert.doesNotMatch(
      identity,
      /profile\.publicProfile/,
    )

    assert.doesNotMatch(
      identity,
      /profile\.privateProfile/,
    )

    assert.doesNotMatch(
      identity,
      /visibility ===/,
    )

    assert.doesNotMatch(
      identity,
      /bottom-5 right-6/,
    )
  })

  it('keeps Taste Title out of the public DNA section', async () => {
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
      source.indexOf(
        'function PublicPreview',
      ),
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
