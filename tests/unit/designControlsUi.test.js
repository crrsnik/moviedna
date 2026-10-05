import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('refined design controls', () => {
  it('uses a custom language menu instead of a native select', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/localization/components/LanguageSwitcher.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.doesNotMatch(source, /<select/)
    assert.match(source, /aria-haspopup="menu"/)
    assert.match(source, /role="menuitemradio"/)
    assert.match(source, /rounded-full/)
  })

  it('uses icon controls for library actions', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/library/components/MediaLibraryActions.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(source, /HeartIcon/)
    assert.match(source, /ClockIcon/)
    assert.match(source, /BookmarkIcon/)
    assert.match(source, /aria-pressed/)
    assert.match(source, /rounded-full/)
  })

  it('keeps the ten-point rating model with ten visual stars', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/ratings/components/MediaRatingControl.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(source, /length: 10/)
    assert.match(source, /type="radio"/)
    assert.match(source, /saveRating/)
    assert.match(source, /deleteRating/)
  })

  it('renders watched as a polished primary action', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/viewingHistory/components/MediaViewingHistoryAction.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(source, /CheckIcon/)
    assert.match(source, /rounded-full/)
    assert.match(source, /markWatched/)
  })
})
