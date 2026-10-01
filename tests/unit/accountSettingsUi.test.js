import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('account settings UI', () => {
  it('keeps account settings separate from profile settings', async () => {
    const router = await readFile(
      new URL('../../src/app/router.jsx', import.meta.url),
      'utf8',
    )

    const page = await readFile(
      new URL(
        '../../src/pages/AccountSettingsPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      router,
      /path:\s*['"]account['"][\s\S]*AccountSettingsPage/,
    )

    assert.match(page, /Account settings/)
    assert.match(page, /Email address/)
    assert.match(page, /readOnly/)
    assert.match(page, /Email changes are not supported yet/)
  })

  it('uses the existing password reset service without adding password storage', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/AccountSettingsPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(page, /requestPasswordReset/)
    assert.match(page, /Send password reset email/)
    assert.match(page, /getPasswordResetErrorMessage/)
    assert.doesNotMatch(page, /updatePassword/)
    assert.doesNotMatch(page, /currentPassword/)
    assert.doesNotMatch(page, /newPassword/)
    assert.doesNotMatch(page, /deleteUser/)
  })
})
