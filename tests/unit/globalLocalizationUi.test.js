import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { messages } from '../../src/features/localization/messages/index.js'
import { translateAuthMessage } from '../../src/features/localization/core/authUiMessages.js'

function keys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix
      ? `${prefix}.${key}`
      : key

    return child
      && typeof child === 'object'
      && !Array.isArray(child)
      ? keys(child, path)
      : [path]
  })
}

describe('global localization UI', () => {
  it('keeps all locale dictionaries structurally aligned', () => {
    const english = keys(messages.en).sort()

    assert.deepEqual(
      keys(messages.fr).sort(),
      english,
    )

    assert.deepEqual(
      keys(messages.ru).sort(),
      english,
    )
  })

  it('translates existing auth domain messages at the UI boundary', () => {
    const t = key => `translated:${key}`

    assert.equal(
      translateAuthMessage(
        t,
        'Incorrect email or password.',
      ),
      'translated:auth.errors.incorrectCredentials',
    )

    assert.equal(
      translateAuthMessage(
        t,
        'Passwords must match.',
      ),
      'translated:auth.validation.passwordsMismatch',
    )

    assert.equal(
      translateAuthMessage(
        t,
        'Future unmapped safe message.',
      ),
      'Future unmapped safe message.',
    )
  })

  it('localizes global navigation and profile navigation', async () => {
    const [header, profile] = await Promise.all([
      readFile(
        new URL(
          '../../src/shared/components/layout/Header.jsx',
          import.meta.url,
        ),
        'utf8',
      ),
      readFile(
        new URL(
          '../../src/features/profile/components/ProfileLayout.jsx',
          import.meta.url,
        ),
        'utf8',
      ),
    ])

    assert.match(header, /useTranslation/)
    assert.match(header, /t\('nav\.movies'\)/)
    assert.match(header, /t\('nav\.friends'\)/)
    assert.match(header, /t\('nav\.logout'\)/)

    assert.match(profile, /useTranslation/)
    assert.match(profile, /t\('profile\.library'\)/)
    assert.match(profile, /t\('profile\.statistics'\)/)
    assert.match(profile, /t\('profile\.accountSettings'\)/)
  })

  it('localizes the auth forms without changing validators', async () => {
    const files = await Promise.all([
      'LoginForm.jsx',
      'RegisterForm.jsx',
      'ForgotPasswordForm.jsx',
    ].map(name => (
      readFile(
        new URL(
          `../../src/features/auth/components/${name}`,
          import.meta.url,
        ),
        'utf8',
      )
    )))

    for (const source of files) {
      assert.match(source, /useTranslation/)
      assert.match(source, /translateAuthMessage/)
    }
  })
})
