import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('localization provider contract', () => {
  it('wraps the existing application providers', async () => {
    const source = await readFile(
      new URL(
        '../../src/app/providers/AppProviders.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    const language = source.indexOf(
      '<LanguageProvider>',
    )

    const auth = source.indexOf(
      '<AuthProvider>',
    )

    const profile = source.indexOf(
      '<UserProfileProvider>',
    )

    assert.ok(language >= 0)
    assert.ok(auth > language)
    assert.ok(profile > auth)
  })

  it('updates the document language and persists selection', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/localization/context/LanguageContext.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /document\.documentElement\.lang = locale/,
    )

    assert.match(
      source,
      /persistLocale\(nextLocale\)/,
    )
  })
})
