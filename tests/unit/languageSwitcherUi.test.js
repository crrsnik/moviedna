import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('language switcher UI', () => {
  it('uses the localization context as the source of truth', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/localization/components/LanguageSwitcher.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(source, /useTranslation/)
    assert.match(source, /locale/)
    assert.match(source, /setLocale/)
    assert.match(source, /supportedLocales/)

    assert.match(
      source,
      /supportedLocales\.map/,
    )

    assert.match(
      source,
      /supportedLocale === locale/,
    )

    assert.match(
      source,
      /setLocale\(supportedLocale\)/,
    )
  })

  it('renders a custom accessible dropdown instead of a native select', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/localization/components/LanguageSwitcher.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.doesNotMatch(source, /<select/)
    assert.doesNotMatch(source, /<option/)

    assert.match(
      source,
      /aria-haspopup="menu"/,
    )

    assert.match(
      source,
      /aria-expanded=\{open\}/,
    )

    assert.match(
      source,
      /role="menu"/,
    )

    assert.match(
      source,
      /role="menuitemradio"/,
    )

    assert.match(
      source,
      /aria-checked=\{selected\}/,
    )

    assert.match(
      source,
      /setOpen\(false\)/,
    )
  })

  it('supports closing the dropdown without changing language', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/localization/components/LanguageSwitcher.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /event\.key === 'Escape'/,
    )

    assert.match(
      source,
      /document\.addEventListener\(\s*'pointerdown'/,
    )

    assert.match(
      source,
      /document\.removeEventListener\(\s*'pointerdown'/,
    )
  })

  it('renders the language switcher in the global header', async () => {
    const header = await readFile(
      new URL(
        '../../src/shared/components/layout/Header.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      header,
      /import LanguageSwitcher/,
    )

    assert.match(
      header,
      /<LanguageSwitcher \/>/,
    )
  })
})
