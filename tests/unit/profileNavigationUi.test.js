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

    for (const [path, label] of [
      ['/profile', 'Overview'],
      ['/profile/library', 'Library'],
      ['/profile/dna', 'My DNA'],
      ['/profile/history', 'History'],
      ['/profile/stats', 'Statistics'],
      ['/profile/settings', 'Profile settings'],
      ['/profile/account', 'Account settings'],
    ]) {
      assert.match(
        layout,
        new RegExp(`to=["']${path}["'][^>]*>[\\s\\S]*?${label}`),
      )
    }

    assert.match(layout, /aria-label="Profile navigation"/)
    assert.match(layout, /overflow-x-auto/)
    assert.match(layout, />\s*Edit profile\s*</)
  })

  it('keeps overview focused on previews instead of duplicate navigation cards', async () => {
    const overview = await readFile(
      new URL('../../src/pages/ProfileOverviewPage.jsx', import.meta.url),
      'utf8',
    )

    assert.match(overview, /Your MovieDNA/)
    assert.match(overview, /View full DNA/)
    assert.match(overview, /Your activity/)
    assert.match(overview, /View statistics/)

    assert.doesNotMatch(overview, /to=["']\/profile\/library["']/)
    assert.doesNotMatch(overview, /to=["']\/profile\/history["']/)
    assert.doesNotMatch(overview, /to=["']\/profile\/settings["']/)
  })
})
