import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('public profile UI contract', () => {
  it('redirects the authenticated user away from their own public route', async () => {
    const page = await readFile(
      new URL('../../src/pages/PublicProfilePage.jsx', import.meta.url),
      'utf8',
    )

    assert.match(
      page,
      /result\.profile\.userId === user\?\.uid/,
    )

    assert.match(
      page,
      /<Navigate to="\/profile" replace \/>/,
    )
  })

  it('keeps user profiles behind authentication', async () => {
    const router = await readFile(
      new URL('../../src/app/router.jsx', import.meta.url),
      'utf8',
    )

    const protectedRoute = router.indexOf('element: <ProtectedRoute />')
    const userProfileRoute = router.indexOf("path: 'users/:username'")

    assert.ok(protectedRoute >= 0)
    assert.ok(userProfileRoute > protectedRoute)
  })

  it('shows safe identity for private profiles while hiding profile content', async () => {
    const page = await readFile(
      new URL('../../src/pages/PublicProfilePage.jsx', import.meta.url),
      'utf8',
    )

    assert.match(page, /result\.kind === 'private'/)
    assert.match(page, /This account is private/)
    assert.match(page, /profile\.displayName/)
    assert.match(page, /profile\.username/)
    assert.match(page, /profile\.avatarId/)
  })

  it('does not render private account data fields', async () => {
    const page = await readFile(
      new URL('../../src/pages/PublicProfilePage.jsx', import.meta.url),
      'utf8',
    )

    for (const field of [
      'photoURL',
      'bio',
      'onboardingCompleted',
    ]) {
      assert.doesNotMatch(
        page,
        new RegExp(field),
      )
    }
  })
})
