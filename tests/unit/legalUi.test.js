import assert from 'node:assert/strict'
import {
  readFile,
} from 'node:fs/promises'
import {
  describe,
  it,
} from 'node:test'

import {
  getLegalDocument,
} from '../../src/features/legal/content/legalDocuments.js'

describe('legal documents', () => {
  for (
    const locale
    of ['en', 'fr', 'ru']
  ) {
    it(`provides Terms and Privacy content in ${locale}`, () => {
      const terms =
        getLegalDocument(
          'terms',
          locale,
        )

      const privacy =
        getLegalDocument(
          'privacy',
          locale,
        )

      assert.ok(terms.title)
      assert.ok(privacy.title)

      assert.ok(
        terms.sections.length >= 8,
      )

      assert.ok(
        privacy.sections.length >= 8,
      )

      assert.ok(terms.updated)
      assert.ok(privacy.updated)
    })
  }

  it('falls back to English for unsupported locales', () => {
    assert.equal(
      getLegalDocument(
        'terms',
        'de',
      ).title,
      'Terms of Use',
    )
  })
})

describe('registration legal notice', () => {
  it('links registration to Terms and Privacy', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/auth/components/RegisterForm.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /to="\/terms"/,
    )

    assert.match(
      source,
      /to="\/privacy"/,
    )

    assert.match(
      source,
      /auth\.register\.legalPrefix/,
    )

    assert.match(
      source,
      /auth\.register\.terms/,
    )

    assert.match(
      source,
      /auth\.register\.privacy/,
    )
  })
})

describe('legal routes', () => {
  it('keeps Terms and Privacy publicly accessible', async () => {
    const source = await readFile(
      new URL(
        '../../src/app/router.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    const terms =
      source.indexOf(
        "path: 'terms'",
      )

    const privacy =
      source.indexOf(
        "path: 'privacy'",
      )

    const guestGuard =
      source.indexOf(
        'element: <GuestOnlyRoute />',
      )

    assert.ok(terms >= 0)
    assert.ok(privacy >= 0)

    assert.ok(
      terms < guestGuard,
    )

    assert.ok(
      privacy < guestGuard,
    )
  })
})
