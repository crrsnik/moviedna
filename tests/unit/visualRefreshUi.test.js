import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('visual refresh UI', () => {
  it('keeps the existing home structure', async () => {
    const home = await readFile(
      new URL('../../src/pages/HomePage.jsx', import.meta.url),
      'utf8',
    )

    const search = home.indexOf('<SearchForm />')
    const recommendations = home.indexOf('<RecommendationSection />')
    const sections = home.indexOf('sections.map')

    assert.ok(search >= 0)
    assert.ok(recommendations > search)
    assert.ok(sections > recommendations)
  })

  it('uses semantic theme colors on media cards', async () => {
    const mediaCard = await readFile(
      new URL(
        '../../src/features/catalog/components/MediaCard.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(mediaCard, /border-border/)
    assert.match(mediaCard, /bg-surface-muted/)
    assert.match(mediaCard, /text-primary/)
    assert.match(mediaCard, /text-secondary/)
    assert.match(mediaCard, /group-hover:text-accent/)
    assert.doesNotMatch(mediaCard, /bg-zinc-900/)
  })

  it('uses semantic theme colors on search', async () => {
    const search = await readFile(
      new URL(
        '../../src/features/catalog/components/SearchForm.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(search, /bg-surface/)
    assert.match(search, /border-border/)
    assert.match(search, /bg-accent/)
    assert.match(search, /text-accent-contrast/)
  })

  it('keeps recommendations structurally unchanged while themed', async () => {
    const section = await readFile(
      new URL(
        '../../src/features/recommendations/components/RecommendationSection.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(section, /RecommendationCard/)
    assert.match(section, /RECOMMENDATION_DISPLAY_LIMIT/)
    assert.match(section, /border-border/)
    assert.match(section, /bg-surface/)
  })
})
