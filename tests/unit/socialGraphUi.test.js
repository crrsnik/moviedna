import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('social graph UI contract', () => {
  it('keeps the friends page behind authentication', async () => {
    const router = await readFile(
      new URL(
        '../../src/app/router.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    const protectedRoute = router.indexOf(
      'element: <ProtectedRoute />',
    )

    const friendsRoute = router.indexOf(
      "path: 'friends'",
    )

    assert.ok(protectedRoute >= 0)
    assert.ok(friendsRoute > protectedRoute)
  })

  it('links authenticated users to the friends page', async () => {
    const header = await readFile(
      new URL(
        '../../src/shared/components/layout/Header.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.ok(
      header.includes('to="/friends"'),
    )

    assert.match(
      header,
      /t\('nav\.friends'\)/,
    )

    assert.match(
      header,
      /isAuthenticated \? \(/,
    )

    assert.match(
      header,
      /role="menu"/,
    )
  })

  it('renders friends, incoming, and sent sections', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/FriendsPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    for (const expectedText of [
      'social.friends.friendsTitle',
      'social.friends.incomingTitle',
      'social.friends.outgoingTitle',
      'social.friends.accept',
      'social.friends.decline',
      'social.friends.cancelRequest',
      'social.friends.removeFriend',
    ]) {
      assert.ok(
        page.includes(expectedText),
        `Expected FriendsPage to contain ${expectedText}`,
      )
    }
  })

  it('uses one social graph subscription and safe public profiles', async () => {
    const hook = await readFile(
      new URL(
        '../../src/features/friends/hooks/useSocialGraph.js',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      hook,
      /subscribeToFriendships/,
    )

    assert.match(
      hook,
      /getPublicProfileByUserId/,
    )

    assert.match(
      hook,
      /friendship\.status === 'accepted'/,
    )

    assert.match(
      hook,
      /friendship\.requestedBy === currentUserId/,
    )
  })
})
