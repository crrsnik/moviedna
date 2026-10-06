import assert from 'node:assert/strict'
import {
  readFile,
} from 'node:fs/promises'
import {
  describe,
  it,
} from 'node:test'

import {
  localizedSavedMediaDisplay,
} from '../../src/features/library/services/localizedSavedMediaService.js'

import {
  resolveDimensionLabel,
  resolveGenreIdLabel,
} from '../../src/features/dna/services/dimensionLabels.js'

describe('localized library display', () => {
  const movie = {
    tmdbId: 1,
    mediaType: 'movie',
    title: 'English title',
    posterPath: '/saved.jpg',
    releaseYear: 2020,
  }

  it('uses a localized movie title without changing the persisted snapshot', () => {
    const result =
      localizedSavedMediaDisplay(
        movie,
        {
          title: 'Русское название',
          posterPath: '/ru.jpg',
          releaseYear: '2020',
        },
      )

    assert.deepEqual(
      result,
      {
        title: 'Русское название',
        posterPath: '/ru.jpg',
        releaseYear: 2020,
      },
    )

    assert.equal(
      movie.title,
      'English title',
    )
  })

  it('localizes TV display fields', () => {
    const result =
      localizedSavedMediaDisplay(
        {
          ...movie,
          mediaType: 'tv',
        },
        {
          name: 'Nom français',
          posterPath: null,
          firstAirDate: '2018-02-03',
        },
      )

    assert.equal(
      result.title,
      'Nom français',
    )

    assert.equal(
      result.posterPath,
      '/saved.jpg',
    )

    assert.equal(
      result.releaseYear,
      2018,
    )
  })

  it('falls back to persisted display data when TMDb localization is incomplete', () => {
    assert.deepEqual(
      localizedSavedMediaDisplay(
        movie,
        {},
      ),
      {
        title: movie.title,
        posterPath:
          movie.posterPath,
        releaseYear:
          movie.releaseYear,
      },
    )
  })
})

describe('localized MovieDNA labels', () => {
  it('keeps English as the backward-compatible default', () => {
    assert.equal(
      resolveGenreIdLabel(28),
      'Action',
    )
  })

  it('localizes genres to Russian and French', () => {
    assert.equal(
      resolveDimensionLabel(
        'genres',
        {
          key: 'genre:35',
          label: 'Comedy',
        },
        'ru',
      ),
      'Комедия',
    )

    assert.equal(
      resolveDimensionLabel(
        'genres',
        {
          key: 'genre:35',
          label: 'Comedy',
        },
        'fr',
      ),
      'Comédie',
    )
  })

  it('localizes media type and decade labels', () => {
    assert.equal(
      resolveDimensionLabel(
        'mediaTypes',
        {
          key: 'media:tv',
          label: 'TV',
        },
        'ru',
      ),
      'Сериалы',
    )

    assert.equal(
      resolveDimensionLabel(
        'decades',
        {
          key: 'decade:2010',
          label: '2010s',
        },
        'fr',
      ),
      'Années 2010',
    )
  })

  it('keeps real person names unchanged', () => {
    assert.equal(
      resolveDimensionLabel(
        'actors',
        {
          key: 'person:123',
          label:
            'Leonardo DiCaprio',
        },
        'ru',
      ),
      'Leonardo DiCaprio',
    )
  })
})

describe('recommendation hide button polish', () => {
  it('uses a centered SVG instead of a font glyph', async () => {
    const source =
      await readFile(
        new URL(
          '../../src/features/recommendations/components/RecommendationCard.jsx',
          import.meta.url,
        ),
        'utf8',
      )

    assert.match(
      source,
      /viewBox="0 0 20 20"/,
    )

    assert.match(
      source,
      /M5 5l10 10M15 5L5 15/,
    )

    assert.doesNotMatch(
      source,
      />\s*×\s*</,
    )
  })
})

describe('localized DNA rendering contract', () => {
  it('resolves each visible trait using the active locale', async () => {
    const source =
      await readFile(
        new URL(
          '../../src/features/dna/components/DnaDimensionSection.jsx',
          import.meta.url,
        ),
        'utf8',
      )

    assert.match(
      source,
      /resolveDimensionLabel/,
    )

    assert.match(
      source,
      /const \{ t, locale \} = useTranslation\(\)/,
    )

    assert.match(
      source,
      /label=\{label\}/,
    )
  })
})
