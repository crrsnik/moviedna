import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('theme toggle UI', () => {
  it('keeps the existing header structure and adds a theme toggle', async () => {
    const header = await readFile(
      new URL(
        '../../src/shared/components/layout/Header.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(header, /to="\/movies"/)
    assert.match(header, /to="\/tv"/)
    assert.match(header, /to="\/actors"/)
    assert.match(header, /<LanguageSwitcher \/>/)
    assert.match(header, /<NotificationBell \/>/)
    assert.match(header, /<ThemeToggle \/>/)
    assert.match(header, /aria-haspopup="menu"/)
  })

  it('toggles the existing theme context without changing layout', async () => {
    const toggle = await readFile(
      new URL(
        '../../src/features/theme/components/ThemeToggle.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(toggle, /useTheme/)
    assert.match(toggle, /toggleTheme/)
    assert.match(toggle, /resolvedTheme/)
    assert.match(toggle, /Use light theme/)
    assert.match(toggle, /Use dark theme/)
  })

  it('uses semantic colors for the application shell', async () => {
    const layout = await readFile(
      new URL(
        '../../src/shared/components/layout/AppLayout.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(layout, /bg-app/)
    assert.match(layout, /text-primary/)
    assert.doesNotMatch(layout, /bg-zinc-950/)
  })
})
