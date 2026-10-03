import assert from 'node:assert/strict'
import {
  readFile,
} from 'node:fs/promises'

import {
  describe,
  it,
} from 'node:test'

import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_CATALOG_BY_ID,
} from '../../src/features/achievements/constants/achievementCatalog.js'

const EXPECTED_IDS = [
  'onboarding_complete',
  'dna_ready',
  'rating_1',
  'rating_10',
  'rating_25',
  'rating_50',
  'rating_100',
  'watched_1',
  'watched_10',
  'watched_25',
  'watched_50',
  'watched_100',
  'movies_10',
  'movies_50',
  'tv_10',
  'tv_50',
  'favorite_1',
  'favorite_10',
  'favorite_25',
  'genres_5',
  'genres_10',
  'decades_3',
  'decades_5',
  'countries_3',
  'countries_5',
  'horror_10',
  'comedy_10',
  'scifi_10',
  'romance_10',
  'friend_1',
  'friends_5',
  'friends_10',
]

describe('achievement catalog UI contract', () => {
  it('contains the complete stable catalog of 32 achievements', () => {
    assert.equal(
      ACHIEVEMENT_CATALOG.length,
      32,
    )

    assert.deepEqual(
      ACHIEVEMENT_CATALOG.map(
        item => item.id,
      ),
      EXPECTED_IDS,
    )

    assert.equal(
      Object.keys(
        ACHIEVEMENT_CATALOG_BY_ID,
      ).length,
      32,
    )
  })

  it('defines display metadata for every achievement', () => {
    for (const item of ACHIEVEMENT_CATALOG) {
      assert.equal(
        typeof item.image,
        'string',
      )

      assert.equal(
        item.image,
        `/achievements/${item.id}.svg`,
      )

      assert.match(
        item.titleKey,
        new RegExp(
          `^achievementsUi\\.items\\.${item.id}\\.title$`,
        ),
      )

      assert.match(
        item.descriptionKey,
        new RegExp(
          `^achievementsUi\\.items\\.${item.id}\\.description$`,
        ),
      )
    }
  })
})

describe('achievement profile UI contract', () => {
  it('shows eight medals by default with expandable collection', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/achievements/components/AchievementsSection.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /const DEFAULT_VISIBLE = 8/,
    )

    assert.match(
      source,
      /aria-expanded=\{expanded\}/,
    )

    assert.match(
      source,
      /achievementsUi\.showLess/,
    )

    assert.match(
      source,
      /achievementsUi\.showAll/,
    )
  })

  it('keeps locked medals visually desaturated', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/achievements/components/AchievementsSection.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(source, /grayscale/)
    assert.match(source, /achievement\.unlocked/)
  })

  it('opens an accessible achievement detail dialog', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/achievements/components/AchievementsSection.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /role="dialog"/,
    )

    assert.match(
      source,
      /aria-modal="true"/,
    )

    assert.match(
      source,
      /achievement\.current/,
    )

    assert.match(
      source,
      /achievement\.target/,
    )

    assert.match(
      source,
      /unlockedAt/,
    )
  })

  it('places achievements after DNA and before activity', async () => {
    const source = await readFile(
      new URL(
        '../../src/pages/ProfileOverviewPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    const dna = source.indexOf(
      '<DnaPreview state={dnaState} />',
    )

    const achievements = source.indexOf(
      '<AchievementsSection state={achievementsState} />',
    )

    const activity = source.indexOf(
      "'profile.overviewPage.activityTitle'",
    )

    assert.ok(dna >= 0)
    assert.ok(achievements > dna)
    assert.ok(activity > achievements)
  })
})

describe('achievement badge assets', () => {
  it('provides an SVG asset for every catalog entry', async () => {
    for (const item of ACHIEVEMENT_CATALOG) {
      const asset = await readFile(
        new URL(
          `../../public${item.image}`,
          import.meta.url,
        ),
        'utf8',
      )

      assert.match(asset, /<svg/)
      assert.match(asset, /viewBox="0 0 256 256"/)
    }
  })
})
