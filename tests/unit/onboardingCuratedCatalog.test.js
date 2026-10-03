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

  it('starts with a balanced movie/TV deck', () => {
    const first = ONBOARDING_CURATED_SEEDS.slice(
      0,
      ONBOARDING_CATALOG_SIZE,
    )

    assert.equal(
      first.filter(seed => seed.mediaType === 'movie').length,
      10,
    )
    assert.equal(
      first.filter(seed => seed.mediaType === 'tv').length,
      10,
    )
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

  it('loads at most 20 cards in source order with bounded concurrency', async () => {
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
      ONBOARDING_CURATED_SEEDS
        .slice(0, ONBOARDING_CATALOG_SIZE)
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
    const first = ONBOARDING_CURATED_SEEDS[0]

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
