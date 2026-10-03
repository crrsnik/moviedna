import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('user search routing', () => {
  it('keeps public profile routes protected and redirects legacy search into Friends', async () => {
    const router = await readFile(
      new URL(
        '../../src/app/router.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    const protectedIndex = router.indexOf(
      'element: <ProtectedRoute />',
    )

    const searchIndex = router.indexOf(
      "path: 'users/search'",
    )

    const publicProfileIndex = router.indexOf(
      "path: 'users/:username'",
    )

    assert.ok(protectedIndex >= 0)
    assert.ok(searchIndex > protectedIndex)
    assert.ok(publicProfileIndex > protectedIndex)

    assert.match(
      router,
      /path:\s*['"]users\/search['"][\s\S]*?<Navigate to="\/friends" replace/,
    )
  })

  it('keeps user discovery inside Friends instead of global navigation', async () => {
    const [header, friends, panel] =
      await Promise.all([
        readFile(
          new URL(
            '../../src/shared/components/layout/Header.jsx',
            import.meta.url,
          ),
          'utf8',
        ),
        readFile(
          new URL(
            '../../src/pages/FriendsPage.jsx',
            import.meta.url,
          ),
          'utf8',
        ),
        readFile(
          new URL(
            '../../src/features/profile/components/UserSearchPanel.jsx',
            import.meta.url,
          ),
          'utf8',
        ),
      ])

    assert.doesNotMatch(
      header,
      /to="\/users\/search"/,
    )

    assert.doesNotMatch(
      header,
      /t\('nav\.users'\)/,
    )

    assert.match(
      friends,
      /<UserSearchPanel \/>/,
    )

    assert.match(
      panel,
      /<UserSearchForm/,
    )

    assert.match(
      panel,
      /<UserSearchResult/,
    )
  })
})
