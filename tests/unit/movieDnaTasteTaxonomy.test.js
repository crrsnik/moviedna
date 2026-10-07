import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { calculateMovieDna } from '../../functions/src/dna/core/calculateMovieDna.js'
import { inferTasteTags } from '../../functions/src/dna/core/tasteTaxonomy.js'

function metadata({
  genres = [],
  keywords = [],
  language = 'en',
  countries = [],
} = {}) {
  return {
    genres: genres.map(id => ({
      id,
      label: String(id),
    })),
    keywords: keywords.map((name, index) => ({
      id: 1000 + index,
      name,
    })),
    originalLanguage: language
      ? {
          code: language,
          label: language,
        }
      : null,
    countries: countries.map(code => ({
      code,
      label: code,
    })),
  }
}

function item(
  id,
  {
    mediaType = 'movie',
    rating = 10,
    genres = [],
    keywords = [],
    language = 'en',
    countries = [],
  } = {},
) {
  return {
    mediaKey: `${mediaType}_${id}`,
    tmdbId: id,
    mediaType,
    rating,
    onboardingReaction: null,
    favorite: false,
    metadata: {
      status: 'ready',
      genres: genres.map(genre => ({
        id: genre,
        label: String(genre),
      })),
      keywords: keywords.map((name, index) => ({
        id: id * 100 + index + 1,
        name,
      })),
      releaseYear: 2020,
      originalLanguage: language
        ? {
            code: language,
            label: language,
          }
        : null,
      countries: countries.map(code => ({
        code,
        label: code,
      })),
      directors: [],
      creators: [],
      actors: [],
      completeness: {
        genres: true,
        releaseYear: true,
        originalLanguage: language !== null,
        countries: true,
        people: true,
      },
    },
  }
}

describe('MovieDNA taste taxonomy', () => {
  it('recognizes psychological thriller only with specific thematic evidence', () => {
    const positive = inferTasteTags(
      metadata({
        genres: [18, 53],
        keywords: ['psychology'],
      }),
      'movie',
    )

    const generic = inferTasteTags(
      metadata({
        genres: [18, 53],
        keywords: [],
      }),
      'movie',
    )

    assert.ok(
      positive.some(
        taste => taste.key === 'taste:psychological-thriller',
      ),
    )

    assert.equal(
      generic.some(
        taste => taste.key === 'taste:psychological-thriller',
      ),
      false,
    )
  })

  it('recognizes crime thriller from the genre combination itself', () => {
    const tastes = inferTasteTags(
      metadata({
        genres: [53, 80],
      }),
      'movie',
    )

    assert.ok(
      tastes.some(
        taste => taste.key === 'taste:crime-thriller',
      ),
    )
  })

  it('distinguishes philosophical, dystopian and space sci-fi', () => {
    const philosophical = inferTasteTags(
      metadata({
        genres: [878, 18],
        keywords: ['consciousness'],
      }),
      'movie',
    )

    const dystopian = inferTasteTags(
      metadata({
        genres: [878],
        keywords: ['dystopia'],
      }),
      'movie',
    )

    const space = inferTasteTags(
      metadata({
        genres: [878],
        keywords: ['space travel'],
      }),
      'movie',
    )

    assert.ok(
      philosophical.some(
        taste => taste.key === 'taste:philosophical-sci-fi',
      ),
    )

    assert.ok(
      dystopian.some(
        taste => taste.key === 'taste:dystopian-sci-fi',
      ),
    )

    assert.ok(
      space.some(
        taste => taste.key === 'taste:space-sci-fi',
      ),
    )
  })

  it('recognizes Russian romantic TV using origin plus romantic evidence', () => {
    const byLanguage = inferTasteTags(
      metadata({
        genres: [18],
        keywords: ['falling in love'],
        language: 'ru',
      }),
      'tv',
    )

    const byCountry = inferTasteTags(
      metadata({
        genres: [18],
        keywords: ['romance'],
        language: 'uk',
        countries: ['RU'],
      }),
      'tv',
    )

    const nonRussian = inferTasteTags(
      metadata({
        genres: [18],
        keywords: ['romance'],
        language: 'en',
        countries: ['US'],
      }),
      'tv',
    )

    assert.ok(
      byLanguage.some(
        taste => taste.key === 'taste:russian-romantic-tv',
      ),
    )

    assert.ok(
      byCountry.some(
        taste => taste.key === 'taste:russian-romantic-tv',
      ),
    )

    assert.equal(
      nonRussian.some(
        taste => taste.key === 'taste:russian-romantic-tv',
      ),
      false,
    )
  })

  it('does not infer emotional drama from Drama alone', () => {
    const genericDrama = inferTasteTags(
      metadata({
        genres: [18],
      }),
      'movie',
    )

    const emotionalDrama = inferTasteTags(
      metadata({
        genres: [18],
        keywords: ['grief'],
      }),
      'movie',
    )

    assert.equal(
      genericDrama.some(
        taste => taste.key === 'taste:emotional-drama',
      ),
      false,
    )

    assert.ok(
      emotionalDrama.some(
        taste => taste.key === 'taste:emotional-drama',
      ),
    )
  })

  it('builds affinity, confidence and strength for repeated specific taste evidence', async () => {
    const dna = await calculateMovieDna({
      items: [
        item(1, {
          rating: 10,
          genres: [18, 53],
          keywords: ['psychology'],
        }),
        item(2, {
          rating: 9,
          genres: [53, 9648],
          keywords: ['paranoia'],
        }),
        item(3, {
          rating: 8,
          genres: [18, 53],
          keywords: ['obsession'],
        }),
      ],
    })

    const psychological = dna.dimensions.tasteTags.find(
      taste => taste.key === 'taste:psychological-thriller',
    )

    assert.ok(psychological)

    assert.equal(
      psychological.affinity,
      1,
    )

    assert.equal(
      psychological.evidenceCount,
      3,
    )

    assert.equal(
      psychological.negativeEvidenceWeight,
      0,
    )

    assert.ok(
      psychological.confidence > 0.9,
    )

    assert.ok(
      psychological.strength > 0.9,
    )
  })

  it('keeps conflicting taste evidence instead of hiding dislikes', async () => {
    const dna = await calculateMovieDna({
      items: [
        item(10, {
          rating: 10,
          genres: [18],
          keywords: ['grief'],
        }),
        item(11, {
          rating: 1,
          genres: [18],
          keywords: ['terminal illness'],
        }),
        item(12, {
          rating: 8,
          genres: [18],
          keywords: ['family tragedy'],
        }),
      ],
    })

    const emotional = dna.dimensions.tasteTags.find(
      taste => taste.key === 'taste:emotional-drama',
    )

    assert.ok(emotional)

    assert.equal(
      emotional.positiveEvidenceWeight,
      1.6,
    )

    assert.equal(
      emotional.negativeEvidenceWeight,
      1,
    )

    assert.equal(
      emotional.affinity,
      0.230769,
    )

    assert.ok(
      emotional.strength < emotional.confidence,
    )
  })

  it('does not dilute one taste tag because the same title matches another tag', async () => {
    const dna = await calculateMovieDna({
      items: [
        item(20, {
          rating: 10,
          genres: [53, 80],
          keywords: ['psychology'],
        }),
      ],
    })

    const psychological = dna.dimensions.tasteTags.find(
      taste => taste.key === 'taste:psychological-thriller',
    )

    const crime = dna.dimensions.tasteTags.find(
      taste => taste.key === 'taste:crime-thriller',
    )

    assert.equal(
      psychological.absoluteEvidenceWeight,
      1,
    )

    assert.equal(
      crime.absoluteEvidenceWeight,
      1,
    )
  })
})
