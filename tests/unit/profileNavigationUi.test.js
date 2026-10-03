import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('profile navigation UI', () => {
  it('keeps one canonical profile navigation with clear destinations', async () => {
    const layout = await readFile(
      new URL(
        '../../src/features/profile/components/ProfileLayout.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    for (const [path, key] of [
      ['/profile', 'profile.overview'],
      ['/profile/library', 'profile.library'],
      ['/profile/dna', 'profile.dna'],
      ['/profile/history', 'profile.history'],
      ['/profile/stats', 'profile.statistics'],
    ]) {
      assert.match(
        layout,
        new RegExp(
          `to=["']${path}["'][\\s\\S]*?t\\(['"]${key.replace('.', '\\.')}['"]\\)`,
        ),
      )
    }

    assert.match(
      layout,
      /aria-label=\{t\('profile\.navigation'\)\}/,
    )

    assert.match(layout, /overflow-x-auto/)

    assert.match(
      layout,
      /t\('profile\.editProfile'\)/,
    )

    assert.doesNotMatch(
      layout,
      /t\('profile\.profileSettings'\)/,
    )

    assert.doesNotMatch(
      layout,
      /t\('profile\.accountSettings'\)/,
    )
  })

  it('keeps overview focused on previews instead of duplicate navigation cards', async () => {
    const overview = await readFile(
      new URL('../../src/pages/ProfileOverviewPage.jsx', import.meta.url),
      'utf8',
    )

    assert.match(overview, /profile\.overviewPage\.dnaTitle/)
    assert.match(overview, /profile\.overviewPage\.viewDna/)
    assert.match(overview, /profile\.overviewPage\.activityTitle/)
    assert.match(overview, /profile\.overviewPage\.viewStatistics/)

    assert.doesNotMatch(overview, /to=["']\/profile\/library["']/)
    assert.doesNotMatch(overview, /to=["']\/profile\/history["']/)
    assert.doesNotMatch(overview, /to=["']\/profile\/settings["']/)
  })
})
