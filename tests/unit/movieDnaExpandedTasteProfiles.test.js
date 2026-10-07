import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  calculateMovieDna,
} from '../../functions/src/dna/core/calculateMovieDna.js'

function media({
  id,
  mediaType = 'movie',
  rating = 10,
  genres = [],
  keywords = [],
  language = 'en',
  countries = [],
}) {
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

      keywords: keywords.map(
        (name, index) => ({
          id: id * 100 + index + 1,
          name,
        }),
      ),

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
        originalLanguage:
          language !== null,
        countries: true,
        people: true,
      },
    },
  }
}

function taste(dna, key) {
  return dna.dimensions.tasteTags.find(
    entry => entry.key === key,
  )
}

function strongestTaste(dna) {
  return [...dna.dimensions.tasteTags]
    .sort((a, b) => (
      b.strength - a.strength
      || b.confidence - a.confidence
      || a.key.localeCompare(b.key)
    ))[0] ?? null
}

function assertStrongPositive(
  dna,
  key,
) {
  const result = taste(dna, key)

  assert.ok(
    result,
    `Missing expected taste ${key}`,
  )

  assert.equal(
    result.affinity,
    1,
  )

  assert.ok(
    result.evidenceCount >= 4,
  )

  assert.ok(
    result.confidence >= 0.9,
    `Expected high confidence for ${key}`,
  )

  assert.ok(
    result.strength >= 0.9,
    `Expected high strength for ${key}`,
  )

  return result
}

describe(
  'MovieDNA expanded synthetic taste profiles',
  () => {
    it(
      'recognizes a romantic-comedy viewer',
      async () => {
        const dna = await calculateMovieDna({
          items: [
            media({
              id: 101,
              rating: 10,
              genres: [35, 10749],
              keywords: [
                'romantic comedy',
                'falling in love',
              ],
            }),

            media({
              id: 102,
              rating: 9,
              genres: [35, 10749],
              keywords: [
                'dating',
              ],
            }),

            media({
              id: 103,
              rating: 9,
              genres: [35, 10749],
              keywords: [
                'romantic relationship',
              ],
            }),

            media({
              id: 104,
              rating: 8,
              genres: [35, 10749],
              keywords: [
                'wedding',
              ],
            }),

            // Romance without comedy is disliked.
            media({
              id: 105,
              rating: 3,
              genres: [18, 10749],
              keywords: [
                'forbidden love',
              ],
            }),
          ],
        })

        const romanticComedy =
          assertStrongPositive(
            dna,
            'taste:romantic-comedy',
          )

        const romanticDrama = taste(
          dna,
          'taste:romantic-drama',
        )

        assert.ok(romanticComedy)

        assert.ok(
          !romanticDrama
          || romanticComedy.strength
            > romanticDrama.strength,
        )

        assert.equal(
          strongestTaste(dna)?.key,
          'taste:romantic-comedy',
        )
      },
    )

    it(
      'recognizes a mystery-detective viewer',
      async () => {
        const dna = await calculateMovieDna({
          items: [
            media({
              id: 201,
              rating: 10,
              genres: [9648],
              keywords: [
                'detective',
              ],
            }),

            media({
              id: 202,
              rating: 9,
              genres: [80, 9648],
              keywords: [
                'murder investigation',
              ],
            }),

            media({
              id: 203,
              rating: 9,
              genres: [9648],
              keywords: [
                'whodunit',
              ],
            }),

            media({
              id: 204,
              rating: 8,
              genres: [80],
              keywords: [
                'private detective',
              ],
            }),

            // Generic thriller without detective evidence.
            media({
              id: 205,
              rating: 4,
              genres: [53],
              keywords: [],
            }),
          ],
        })

        assertStrongPositive(
          dna,
          'taste:mystery-detective',
        )

        assert.equal(
          strongestTaste(dna)?.key,
          'taste:mystery-detective',
        )
      },
    )

    it(
      'recognizes a dark-fantasy viewer',
      async () => {
        const dna = await calculateMovieDna({
          items: [
            media({
              id: 301,
              rating: 10,
              genres: [14],
              keywords: [
                'dark fantasy',
              ],
            }),

            media({
              id: 302,
              rating: 9,
              genres: [14],
              keywords: [
                'witchcraft',
              ],
            }),

            media({
              id: 303,
              rating: 9,
              genres: [14],
              keywords: [
                'curse',
              ],
            }),

            media({
              id: 304,
              rating: 8,
              genres: [14],
              keywords: [
                'black magic',
              ],
            }),

            // Lighter fantasy adventure is disliked.
            media({
              id: 305,
              rating: 3,
              genres: [12, 14],
              keywords: [
                'quest',
              ],
            }),
          ],
        })

        const darkFantasy =
          assertStrongPositive(
            dna,
            'taste:dark-fantasy',
          )

        const fantasyAdventure = taste(
          dna,
          'taste:fantasy-adventure',
        )

        assert.ok(
          !fantasyAdventure
          || darkFantasy.strength
            > fantasyAdventure.strength,
        )

        assert.equal(
          strongestTaste(dna)?.key,
          'taste:dark-fantasy',
        )
      },
    )

    it(
      'recognizes an anime viewer from repeated Japanese animation',
      async () => {
        const dna = await calculateMovieDna({
          items: [
            media({
              id: 401,
              rating: 10,
              genres: [16],
              language: 'ja',
              countries: ['JP'],
            }),

            media({
              id: 402,
              rating: 9,
              genres: [16, 14],
              language: 'ja',
              countries: ['JP'],
            }),

            media({
              id: 403,
              rating: 9,
              genres: [16, 18],
              language: 'ja',
              countries: ['JP'],
            }),

            media({
              id: 404,
              rating: 8,
              genres: [16],
              language: 'ja',
              countries: ['JP'],
            }),

            // Non-Japanese animation is disliked.
            media({
              id: 405,
              rating: 3,
              genres: [16],
              language: 'en',
              countries: ['US'],
            }),
          ],
        })

        assertStrongPositive(
          dna,
          'taste:anime',
        )

        assert.equal(
          strongestTaste(dna)?.key,
          'taste:anime',
        )
      },
    )
  },
)
