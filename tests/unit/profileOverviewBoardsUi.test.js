import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('own profile public boards UI', () => {
  it('loads public boards for the authenticated owner', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/ProfileOverviewPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      page,
      /useAuth/,
    )

    assert.match(
      page,
      /usePublicBoards\(user\.uid\)/,
    )

    assert.match(
      page,
      /<PublicBoards/,
    )
  })

  it('opens own public boards through Library', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/ProfileOverviewPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      page,
      /\/profile\/library\?view=list&listId=/,
    )
  })

  it('keeps the public profile route as the default board link', async () => {
    const component = await readFile(
      new URL(
        '../../src/features/profile/components/PublicBoards.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      component,
      /boardHref/,
    )

    assert.match(
      component,
      /\/users\/\$\{encodeURIComponent/,
    )
  })
})
