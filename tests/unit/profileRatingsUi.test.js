import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('profile ratings UI contract', () => {
  it('exposes ratings as a profile route', async () => {
    const router = await readFile(
      new URL(
        '../../src/app/router.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      router,
      /path: 'ratings'.*ProfileRatingsPage/,
    )
  })

  it('shows Ratings in profile navigation', async () => {
    const layout = await readFile(
      new URL(
        '../../src/features/profile/components/ProfileLayout.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      layout,
      /to="\/profile\/ratings"/,
    )

    assert.match(
      layout,
      /profile\.ratings/,
    )
  })

  it('keeps ratings out of Library UI', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/LibraryPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    const home = await readFile(
      new URL(
        '../../src/features/library/components/LibraryBoardsHome.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.doesNotMatch(
      page,
      /UserRatings/,
    )

    assert.doesNotMatch(
      home,
      /view: 'ratings'/,
    )
  })

  it('redirects the legacy Library ratings URL', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/LibraryPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      page,
      /selection\.view === 'ratings'/,
    )

    assert.match(
      page,
      /to="\/profile\/ratings"/,
    )
  })
})
