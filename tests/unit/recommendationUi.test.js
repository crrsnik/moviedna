import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('recommendation UI contract', () => {
  it('shows personalized recommendations only for authenticated Home users', async () => {
    const home = await readFile(
      new URL(
        '../../src/pages/HomePage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      home,
      /useAuth/,
    )

    assert.match(
      home,
      /user\s*&&\s*<RecommendationSection/,
    )

    assert.match(
      home,
      /Recommended|RecommendationSection/,
    )
  })

  it('renders recommendations with accessible match score and reasons', async () => {
    const card = await readFile(
      new URL(
        '../../src/features/recommendations/components/RecommendationCard.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(card, /MediaCard/)
    assert.match(card, /recommendation\.score/)
    assert.match(card, /% match/)
    assert.match(card, /aria-label=/)
    assert.match(card, /recommendation\.reasons/)
  })

  it('provides loading, unavailable, error, retry and empty states', async () => {
    const section = await readFile(
      new URL(
        '../../src/features/recommendations/components/RecommendationSection.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    for (const kind of [
      'loading',
      'unavailable',
      'error',
      'empty',
      'ready',
    ]) {
      assert.match(
        section,
        new RegExp(`['"]${kind}['"]`),
      )
    }

    assert.match(section, /aria-live=/)
    assert.match(section, /role="alert"/)
    assert.match(section, /Retry/)
    assert.match(section, /useRecommendations/)
  })

  it('keeps the recommendation row keyboard reachable', async () => {
    const section = await readFile(
      new URL(
        '../../src/features/recommendations/components/RecommendationSection.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(section, /role="region"/)
    assert.match(section, /tabIndex=\{0\}/)
    assert.match(section, /overflow-x-auto/)
    assert.match(section, /aria-labelledby=/)
  })
})
