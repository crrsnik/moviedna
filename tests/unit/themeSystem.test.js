import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('theme system contract', () => {
  it('boots the theme before React renders', async () => {
    const html = await readFile(
      new URL('../../index.html', import.meta.url),
      'utf8',
    )

    assert.match(html, /data-moviedna-theme-bootstrap/)
    assert.match(html, /prefers-color-scheme: dark/)
    assert.match(html, /document\.documentElement\.dataset\.theme/)
  })

  it('provides light, dark, and system theme preferences', async () => {
    const context = await readFile(
      new URL(
        '../../src/features/theme/context/ThemeContext.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(context, /moviedna-theme/)
    assert.match(context, /'light'/)
    assert.match(context, /'dark'/)
    assert.match(context, /'system'/)
    assert.match(context, /toggleTheme/)
  })

  it('wraps application providers with ThemeProvider', async () => {
    const providers = await readFile(
      new URL('../../src/app/providers/AppProviders.jsx', import.meta.url),
      'utf8',
    )

    assert.match(providers, /ThemeProvider/)
    assert.match(
      providers,
      /<ThemeProvider>[\s\S]*<LanguageProvider>/,
    )
  })

  it('defines semantic design tokens for both themes', async () => {
    const css = await readFile(
      new URL('../../src/index.css', import.meta.url),
      'utf8',
    )

    assert.match(css, /\[data-theme="light"\]/)
    assert.match(css, /\[data-theme="dark"\]/)
    assert.match(css, /--app-background/)
    assert.match(css, /--app-surface/)
    assert.match(css, /--app-text-primary/)
    assert.match(css, /--app-accent/)
  })
})
