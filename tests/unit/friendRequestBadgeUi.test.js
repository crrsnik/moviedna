import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('friend request badge UI contract', () => {
  it('counts only incoming pending requests', async () => {
    const hook = await readFile(
      new URL(
        '../../src/features/friends/hooks/useIncomingFriendRequestCount.js',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      hook,
      /friendship\.status === 'pending'/,
    )

    assert.match(
      hook,
      /friendship\.requestedBy !== userId/,
    )

    assert.match(
      hook,
      /subscribeToFriendships/,
    )
  })

  it('renders the incoming request count beside Friends', async () => {
    const header = await readFile(
      new URL(
        '../../src/shared/components/layout/Header.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      header,
      /incomingFriendRequestCount > 0/,
    )

    assert.match(
      header,
      /t\(\s*'nav\.incomingFriendRequests'/,
    )

    assert.match(
      header,
      /to="\/friends"/,
    )
  })

  it('caps the visible badge at 99+', async () => {
    const header = await readFile(
      new URL(
        '../../src/shared/components/layout/Header.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      header,
      /incomingFriendRequestCount > 99/,
    )

    assert.match(
      header,
      /'99\+'/,
    )
  })
})
