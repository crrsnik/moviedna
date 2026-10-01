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

    assert.match(
      source,
      /useTranslation/,
    )

    assert.match(
      source,
      /locale/,
    )

    assert.match(
      source,
      /setLocale/,
    )

    assert.match(
      source,
      /supportedLocales/,
    )

    assert.match(
      source,
      /value=\{locale\}/,
    )

    assert.match(
      source,
      /setLocale\(event\.target\.value\)/,
    )

    assert.match(
      source,
      /supportedLocales\.map/,
    )

    assert.match(
      source,
      /toUpperCase\(\)/,
    )

    assert.match(
      source,
      /t\('language\.label'\)/,
    )
  })

  it('renders the language switcher in the global header', async () => {
    const source = await readFile(
      new URL(
        '../../src/shared/components/layout/Header.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /LanguageSwitcher/,
    )

    assert.match(
      source,
      /<LanguageSwitcher \/>/,
    )
  })
})
