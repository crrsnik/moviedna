import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('friendship UI contract', () => {
  it('renders friendship controls on another user profile', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/PublicProfilePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      page,
      /<FriendshipControls/,
    )

    assert.match(
      page,
      /targetUserId=\{profile\.userId\}/,
    )
  })

  it('supports all friendship relationship states', async () => {
    const controls = await readFile(
      new URL(
        '../../src/features/friends/components/FriendshipControls.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    for (const label of [
      'Add friend',
      'Request sent',
      'Cancel request',
      'Friend request received',
      'Accept',
      'Decline',
      'Friends',
      'Remove friend',
    ]) {
      assert.match(
        controls,
        new RegExp(label),
      )
    }
  })

  it('subscribes to the authenticated users social graph', async () => {
    const hook = await readFile(
      new URL(
        '../../src/features/friends/hooks/useFriendship.js',
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
      /members\.includes\(targetUserId\)/,
    )
  })

  it('connects every friendship action through the service', async () => {
    const hook = await readFile(
      new URL(
        '../../src/features/friends/hooks/useFriendship.js',
        import.meta.url,
      ),
      'utf8',
    )

    for (const action of [
      'createFriendRequest',
      'acceptFriendRequest',
      'cancelFriendRequest',
      'declineFriendRequest',
      'removeFriend',
    ]) {
      assert.match(
        hook,
        new RegExp(action),
      )
    }
  })
})
