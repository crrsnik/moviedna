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
  'rating_250',
  'rating_500',
  'watched_1',
  'watched_10',
  'watched_25',
  'watched_50',
  'watched_100',
  'watched_250',
  'watched_500',
  'movies_10',
  'movies_50',
  'movies_100',
  'movies_250',
  'tv_10',
  'tv_50',
  'tv_100',
  'tv_250',
  'favorite_1',
  'favorite_10',
  'favorite_25',
  'favorite_50',
  'favorite_100',
  'genres_5',
  'genres_10',
  'genres_15',
  'decades_3',
  'decades_5',
  'decades_7',
  'countries_3',
  'countries_5',
  'countries_10',
  'countries_20',
  'horror_10',
  'horror_25',
  'horror_50',
  'comedy_10',
  'comedy_25',
  'comedy_50',
  'scifi_10',
  'scifi_25',
  'scifi_50',
  'romance_10',
  'romance_25',
  'romance_50',
  'friend_1',
  'friends_5',
  'friends_10',
  'friends_25',
  'friends_50',
  'auteur_devotee',
  'familiar_face',
  'film_archaeologist',
  'genre_historian',
  'world_cinema_scholar',
  'genre_omnivore',
  'generations_of_cinema',
  'long_road',
  'secret_director_journey',
  'secret_actor_eras',
  'secret_franchise_marathon',
  'secret_century_club',
  'secret_global_nomad',
  'secret_genre_timecapsule',
]

describe('achievement catalog UI contract', () => {
  it('contains the complete stable catalog of 70 achievements', () => {
    assert.equal(
      ACHIEVEMENT_CATALOG.length,
      70,
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
      70,
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
