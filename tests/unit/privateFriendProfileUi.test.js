import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('private friend profile UI contract', () => {
  it('uses one friendship state for controls and profile access', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/PublicProfilePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      page,
      /useFriendship\(/,
    )

    assert.match(
      page,
      /friendshipState=\{friendshipState\}/,
    )
  })

  it('allows accepted friends to request the private preview', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/PublicProfilePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      page,
      /friendshipState\.status === 'friends'/,
    )

    assert.match(
      page,
      /canViewPreview/,
    )

    assert.match(
      page,
      /usePublicProfilePreview\(previewUid\)/,
    )
  })

  it('keeps pending and unrelated private profiles locked', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/PublicProfilePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      page,
      /friendshipState\.status !== 'friends'/,
    )

    assert.match(
      page,
      /profile\.public\.privateTitle/,
    )
  })

  it('does not create a friendship hook inside the controls component', async () => {
    const controls = await readFile(
      new URL(
        '../../src/features/friends/components/FriendshipControls.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.doesNotMatch(
      controls,
      /useFriendship/,
    )

    assert.match(
      controls,
      /friendshipState/,
    )
  })
})
