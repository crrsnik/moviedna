import {
  describe,
  it,
} from 'node:test'
import assert from 'node:assert/strict'

import {
  ONBOARDING_CATALOG_CONCURRENCY,
  ONBOARDING_CATALOG_SIZE,
  ONBOARDING_CURATED_SEEDS,
  loadCuratedOnboardingCatalog,
  selectOnboardingSeeds,
} from '../../src/features/onboarding/services/onboardingCuratedCatalog.js'
import {
  TmdbError,
} from '../../src/features/catalog/services/tmdbErrors.js'
import {
  getOnboardingDiagnosticProfile,
  ONBOARDING_DIAGNOSTIC_ROLE_TARGETS,
} from '../../src/features/onboarding/services/onboardingDiagnosticPlan.js'

describe('Curated onboarding catalogue', () => {
  it('keeps a large unique movie/TV seed pool', () => {
    const keys = ONBOARDING_CURATED_SEEDS.map(
      ({ mediaType, tmdbId }) => (
        `${mediaType}_${tmdbId}`
      ),
    )

    assert.equal(
      new Set(keys).size,
      keys.length,
    )
    assert.ok(keys.length >= 50)

    const movies = ONBOARDING_CURATED_SEEDS
      .filter(seed => seed.mediaType === 'movie')
      .length

    const tv = ONBOARDING_CURATED_SEEDS
      .filter(seed => seed.mediaType === 'tv')
      .length

    assert.ok(movies >= 20)
    assert.ok(tv >= 20)
  })

  it('builds a balanced diagnostic 30-card deck', () => {
    const first = selectOnboardingSeeds([])
      .slice(
        0,
        ONBOARDING_CATALOG_SIZE,
      )

    assert.equal(
      first.filter(
        seed => seed.mediaType === 'movie',
      ).length,
      15,
    )

    assert.equal(
      first.filter(
        seed => seed.mediaType === 'tv',
      ).length,
      15,
    )

    const roleCounts = {
      anchor: 0,
      discriminator: 0,
      probe: 0,
    }

    const tastes = new Set()
    const franchises = []

    for (const seed of first) {
      const profile =
        getOnboardingDiagnosticProfile(seed)

      roleCounts[profile.role] += 1

      for (
        const taste
        of profile.tasteTargets
      ) {
        tastes.add(taste)
      }

      if (profile.franchiseGroup) {
        franchises.push(
          profile.franchiseGroup,
        )
      }
    }

    assert.deepEqual(
      roleCounts,
      ONBOARDING_DIAGNOSTIC_ROLE_TARGETS,
    )

    assert.equal(
      new Set(franchises).size,
      franchises.length,
    )

    for (const taste of [
      'taste:psychological-thriller',
      'taste:crime-thriller',
      'taste:emotional-drama',
      'taste:philosophical-sci-fi',
      'taste:dystopian-sci-fi',
      'taste:space-sci-fi',
      'taste:coming-of-age',
      'taste:dark-comedy',
      'taste:slasher',
      'taste:supernatural-horror',
    ]) {
      assert.ok(
        tastes.has(taste),
        `Missing diagnostic coverage for ${taste}`,
      )
    }
  })

  it('removes only exact identities already answered', () => {
    const selected = selectOnboardingSeeds([
      {
        tmdbId: 603,
        mediaType: 'movie',
        reaction: 'like',
        genreIds: [],
      },
      {
        tmdbId: 1396,
        mediaType: 'tv',
        reaction: 'skip',
        genreIds: [],
      },
    ])

    assert.equal(
      selected.some(
        seed => (
          seed.mediaType === 'movie'
          && seed.tmdbId === 603
        ),
      ),
      false,
    )

    assert.equal(
      selected.some(
        seed => (
          seed.mediaType === 'tv'
          && seed.tmdbId === 1396
        ),
      ),
      false,
    )

    assert.ok(selected.length > 20)
  })

  it('loads at most 30 diagnostic cards in selected order with bounded concurrency', async () => {
    let active = 0
    let maximumActive = 0

    const result = await loadCuratedOnboardingCatalog({
      language: 'fr-FR',
      loadSummary: async ({
        mediaType,
        tmdbId,
        language,
      }) => {
        active += 1
        maximumActive = Math.max(
          maximumActive,
          active,
        )

        await new Promise(
          resolve => setImmediate(resolve),
        )

        active -= 1

        return {
          id: tmdbId,
          mediaType,
          title: String(tmdbId),
          genreIds: [],
          language,
        }
      },
    })

    assert.equal(
      result.length,
      ONBOARDING_CATALOG_SIZE,
    )

    assert.ok(
      maximumActive
      <= ONBOARDING_CATALOG_CONCURRENCY,
    )

    assert.deepEqual(
      result.map(item => (
        `${item.mediaType}_${item.id}`
      )),
      selectOnboardingSeeds([])
        .slice(
          0,
          ONBOARDING_CATALOG_SIZE,
        )
        .map(seed => (
          `${seed.mediaType}_${seed.tmdbId}`
        )),
    )

    assert.ok(
      result.every(
        item => item.language === 'fr-FR',
      ),
    )
  })

  it('skips missing curated entries and continues filling the deck', async () => {
    const first = selectOnboardingSeeds([])[0]

    const result = await loadCuratedOnboardingCatalog({
      language: 'en-US',
      loadSummary: async ({
        mediaType,
        tmdbId,
      }) => {
        if (
          mediaType === first.mediaType
          && tmdbId === first.tmdbId
        ) {
          throw new TmdbError('missing')
        }

        return {
          id: tmdbId,
          mediaType,
          title: String(tmdbId),
          genreIds: [],
        }
      },
    })

    assert.equal(
      result.length,
      ONBOARDING_CATALOG_SIZE,
    )

    assert.equal(
      result.some(
        item => (
          item.mediaType === first.mediaType
          && item.id === first.tmdbId
        ),
      ),
      false,
    )
  })

  it('does not hide systemic TMDB failures', async () => {
    await assert.rejects(
      loadCuratedOnboardingCatalog({
        loadSummary: async () => {
          throw new TmdbError('network')
        },
      }),
      { code: 'network' },
    )
  })
})
