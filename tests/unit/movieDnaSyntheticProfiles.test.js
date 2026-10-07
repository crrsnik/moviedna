import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { calculateMovieDna } from '../../functions/src/dna/core/calculateMovieDna.js'

const complete = {
  genres: true,
  releaseYear: true,
  originalLanguage: true,
  countries: true,
  people: true,
}

let nextId = 1000

function media({
  mediaType = 'movie',
  rating = 8,
  genres = [],
  keywords = [],
  language = 'en',
  countries = ['US'],
  releaseYear = 2020,
} = {}) {
  const id = nextId
  nextId += 1

  return {
    mediaKey: `${mediaType}_${id}`,
    tmdbId: id,
    mediaType,
    rating,
    onboardingReaction: null,
    favorite: false,
    metadata: {
      status: 'ready',
      genres: genres.map((genre) => ({
        id: genre.id,
        label: genre.label,
      })),
      keywords: keywords.map((name, index) => ({
        id: id * 100 + index + 1,
        name,
      })),
      releaseYear,
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
      completeness: { ...complete },
    },
  }
}

const GENRES = {
  drama: { id: 18, label: 'Drama' },
  comedy: { id: 35, label: 'Comedy' },
  thriller: { id: 53, label: 'Thriller' },
  crime: { id: 80, label: 'Crime' },
  mystery: { id: 9648, label: 'Mystery' },
  sciFi: { id: 878, label: 'Science Fiction' },
  romance: { id: 10749, label: 'Romance' },
  action: { id: 28, label: 'Action' },
  horror: { id: 27, label: 'Horror' },
}

function taste(dna, key) {
  return dna.dimensions.tasteTags.find(
    entry => entry.key === key,
  )
}

function strongestTaste(dna) {
  return [...dna.dimensions.tasteTags]
    .sort(
      (a, b) => (
        b.strength - a.strength
        || b.confidence - a.confidence
        || b.affinity - a.affinity
        || a.key.localeCompare(b.key)
      ),
    )[0] ?? null
}

describe('MovieDNA synthetic taste profiles', () => {
  it('recognizes a psychological-thriller viewer despite broad Drama evidence', async () => {
    const dna = await calculateMovieDna({
      items: [
        media({
          rating: 10,
          genres: [GENRES.drama, GENRES.thriller, GENRES.mystery],
          keywords: ['psychology', 'paranoia'],
        }),
        media({
          rating: 9,
          genres: [GENRES.thriller, GENRES.crime],
          keywords: ['obsession'],
        }),
        media({
          rating: 9,
          genres: [GENRES.drama, GENRES.thriller],
          keywords: ['unreliable narrator'],
        }),
        media({
          rating: 8,
          genres: [GENRES.thriller, GENRES.mystery],
          keywords: ['memory loss'],
        }),

        // Broad Drama exposure should not become the defining taste.
        media({
          rating: 6,
          genres: [GENRES.drama],
          keywords: [],
        }),
        media({
          rating: 4,
          genres: [GENRES.drama, GENRES.romance],
          keywords: [],
        }),

        // Different Thriller subtype is disliked.
        media({
          rating: 3,
          genres: [GENRES.action, GENRES.thriller],
          keywords: [],
        }),
      ],
    })

    const psychological = taste(
      dna,
      'taste:psychological-thriller',
    )

    assert.ok(psychological)
    assert.equal(psychological.affinity, 1)
    assert.ok(psychological.confidence >= 0.9)
    assert.ok(psychological.strength >= 0.9)

    assert.equal(
      strongestTaste(dna)?.key,
      'taste:psychological-thriller',
    )

    const drama = dna.dimensions.specificGenres.find(
      entry => entry.key === 'genre:18',
    )

    const thriller = dna.dimensions.specificGenres.find(
      entry => entry.key === 'genre:53',
    )

    assert.ok(thriller.strength > drama.strength)
  })

  it('recognizes an emotional-drama viewer without treating all Drama as equivalent', async () => {
    const dna = await calculateMovieDna({
      items: [
        media({
          rating: 10,
          genres: [GENRES.drama],
          keywords: ['grief', 'loss of loved one'],
        }),
        media({
          rating: 9,
          genres: [GENRES.drama, GENRES.romance],
          keywords: ['terminal illness'],
        }),
        media({
          rating: 9,
          genres: [GENRES.drama],
          keywords: ['family tragedy'],
        }),
        media({
          rating: 8,
          genres: [GENRES.drama],
          keywords: ['death of parent'],
        }),

        media({
          rating: 5,
          genres: [GENRES.drama, GENRES.crime],
          keywords: [],
        }),
        media({
          rating: 4,
          genres: [GENRES.drama],
          keywords: [],
        }),

        media({
          rating: 7,
          genres: [GENRES.comedy],
          keywords: [],
        }),
      ],
    })

    const emotional = taste(
      dna,
      'taste:emotional-drama',
    )

    assert.ok(emotional)
    assert.equal(emotional.affinity, 1)
    assert.ok(emotional.confidence >= 0.9)
    assert.ok(emotional.strength >= 0.9)

    assert.equal(
      strongestTaste(dna)?.key,
      'taste:emotional-drama',
    )
  })

  it('recognizes philosophical sci-fi instead of generic science fiction', async () => {
    const dna = await calculateMovieDna({
      items: [
        media({
          rating: 10,
          genres: [GENRES.sciFi, GENRES.drama],
          keywords: ['consciousness', 'identity'],
        }),
        media({
          rating: 9,
          genres: [GENRES.sciFi],
          keywords: ['existentialism'],
        }),
        media({
          rating: 9,
          genres: [GENRES.sciFi, GENRES.drama],
          keywords: ['nature of reality'],
        }),
        media({
          rating: 8,
          genres: [GENRES.sciFi],
          keywords: ['meaning of life'],
        }),

        // Space spectacle without philosophical theme.
        media({
          rating: 4,
          genres: [GENRES.sciFi, GENRES.action],
          keywords: ['space travel'],
        }),
        media({
          rating: 5,
          genres: [GENRES.sciFi, GENRES.action],
          keywords: ['spaceship'],
        }),
      ],
    })

    const philosophical = taste(
      dna,
      'taste:philosophical-sci-fi',
    )

    const space = taste(
      dna,
      'taste:space-sci-fi',
    )

    assert.ok(philosophical)
    assert.equal(philosophical.affinity, 1)
    assert.ok(philosophical.strength >= 0.9)

    assert.ok(space)
    assert.ok(space.affinity <= 0)

    assert.equal(
      strongestTaste(dna)?.key,
      'taste:philosophical-sci-fi',
    )
  })

  it('recognizes Russian romantic TV from format, origin and romantic evidence', async () => {
    const dna = await calculateMovieDna({
      items: [
        media({
          mediaType: 'tv',
          rating: 10,
          genres: [GENRES.drama, GENRES.romance],
          keywords: ['falling in love'],
          language: 'ru',
          countries: ['RU'],
        }),
        media({
          mediaType: 'tv',
          rating: 9,
          genres: [GENRES.drama],
          keywords: ['love triangle'],
          language: 'ru',
          countries: ['RU'],
        }),
        media({
          mediaType: 'tv',
          rating: 9,
          genres: [GENRES.romance],
          keywords: ['relationship'],
          language: 'ru',
          countries: ['RU'],
        }),
        media({
          mediaType: 'tv',
          rating: 8,
          genres: [GENRES.drama, GENRES.romance],
          keywords: ['first love'],
          language: 'ru',
          countries: ['RU'],
        }),

        // Russian non-romantic TV.
        media({
          mediaType: 'tv',
          rating: 5,
          genres: [GENRES.crime],
          keywords: [],
          language: 'ru',
          countries: ['RU'],
        }),

        // Romantic content from another origin.
        media({
          mediaType: 'tv',
          rating: 5,
          genres: [GENRES.drama, GENRES.romance],
          keywords: ['falling in love'],
          language: 'en',
          countries: ['US'],
        }),
      ],
    })

    const russianRomance = taste(
      dna,
      'taste:russian-romantic-tv',
    )

    assert.ok(russianRomance)
    assert.equal(russianRomance.affinity, 1)
    assert.ok(russianRomance.confidence >= 0.9)
    assert.ok(russianRomance.strength >= 0.9)

    assert.equal(
      strongestTaste(dna)?.key,
      'taste:russian-romantic-tv',
    )
  })

  it('does not create a confident taste identity from one liked title', async () => {
    const dna = await calculateMovieDna({
      items: [
        media({
          rating: 10,
          genres: [GENRES.drama],
          keywords: ['grief'],
        }),
      ],
    })

    const emotional = taste(
      dna,
      'taste:emotional-drama',
    )

    assert.ok(emotional)
    assert.equal(emotional.affinity, 1)

    assert.ok(
      emotional.confidence < 0.2,
    )

    assert.ok(
      emotional.strength < 0.2,
    )
  })

  it('reduces taste strength when the same specific pattern is repeatedly disliked', async () => {
    const dna = await calculateMovieDna({
      items: [
        media({
          rating: 10,
          genres: [GENRES.horror],
          keywords: ['supernatural'],
        }),
        media({
          rating: 2,
          genres: [GENRES.horror],
          keywords: ['ghost'],
        }),
        media({
          rating: 2,
          genres: [GENRES.horror],
          keywords: ['demonic possession'],
        }),
      ],
    })

    const supernatural = taste(
      dna,
      'taste:supernatural-horror',
    )

    assert.ok(supernatural)
    assert.ok(supernatural.affinity < 0)
    assert.ok(supernatural.strength < 0)
    assert.ok(supernatural.confidence > 0.9)
  })
})
