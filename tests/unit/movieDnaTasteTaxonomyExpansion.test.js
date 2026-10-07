import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  inferTasteTags,
  TASTE_RULES,
} from '../../functions/src/dna/core/tasteTaxonomy.js'

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

    keywords: keywords.map(
      (name, index) => ({
        id: 1000 + index,
        name,
      }),
    ),

    originalLanguage: language
      ? {
          code: language,
          label: language,
        }
      : null,

    countries: countries.map(
      code => ({
        code,
        label: code,
      }),
    ),
  }
}

function keys(options, mediaType = 'movie') {
  return new Set(
    inferTasteTags(
      metadata(options),
      mediaType,
    ).map(value => value.key),
  )
}

describe(
  'MovieDNA expanded taste taxonomy',
  () => {
    it(
      'contains 21 semantic taste rules',
      () => {
        assert.equal(
          TASTE_RULES.length,
          21,
        )

        assert.equal(
          new Set(
            TASTE_RULES.map(
              rule => rule.key,
            ),
          ).size,
          21,
        )
      },
    )

    it(
      'distinguishes romantic drama and romantic comedy',
      () => {
        const drama = keys({
          genres: [18, 10749],
          keywords: [
            'falling in love',
          ],
        })

        const comedy = keys({
          genres: [35, 10749],
          keywords: [
            'romantic comedy',
          ],
        })

        assert.ok(
          drama.has(
            'taste:romantic-drama',
          ),
        )

        assert.equal(
          drama.has(
            'taste:romantic-comedy',
          ),
          false,
        )

        assert.ok(
          comedy.has(
            'taste:romantic-comedy',
          ),
        )
      },
    )

    it(
      'does not infer romance from genre alone',
      () => {
        const result = keys({
          genres: [18, 10749],
          keywords: [],
        })

        assert.equal(
          result.has(
            'taste:romantic-drama',
          ),
          false,
        )
      },
    )

    it(
      'recognizes detective mystery evidence',
      () => {
        const result = keys({
          genres: [9648],
          keywords: [
            'murder investigation',
          ],
        })

        assert.ok(
          result.has(
            'taste:mystery-detective',
          ),
        )
      },
    )

    it(
      'does not label every mystery as detective',
      () => {
        const result = keys({
          genres: [9648],
          keywords: [],
        })

        assert.equal(
          result.has(
            'taste:mystery-detective',
          ),
          false,
        )
      },
    )

    it(
      'recognizes action spectacle beyond Action alone',
      () => {
        const spectacle = keys({
          genres: [28],
          keywords: [
            'car chase',
          ],
        })

        const generic = keys({
          genres: [28],
          keywords: [],
        })

        assert.ok(
          spectacle.has(
            'taste:action-spectacle',
          ),
        )

        assert.equal(
          generic.has(
            'taste:action-spectacle',
          ),
          false,
        )
      },
    )

    it(
      'distinguishes fantasy adventure and dark fantasy',
      () => {
        const adventure = keys({
          genres: [14, 12],
          keywords: [
            'quest',
          ],
        })

        const dark = keys({
          genres: [14],
          keywords: [
            'dark fantasy',
          ],
        })

        assert.ok(
          adventure.has(
            'taste:fantasy-adventure',
          ),
        )

        assert.ok(
          dark.has(
            'taste:dark-fantasy',
          ),
        )
      },
    )

    it(
      'recognizes historical period storytelling',
      () => {
        const result = keys({
          genres: [18, 36],
          keywords: [
            'period drama',
          ],
        })

        assert.ok(
          result.has(
            'taste:historical-period',
          ),
        )
      },
    )

    it(
      'recognizes war drama with thematic evidence',
      () => {
        const result = keys({
          genres: [18, 10752],
          keywords: [
            'war trauma',
          ],
        })

        assert.ok(
          result.has(
            'taste:war-drama',
          ),
        )
      },
    )

    it(
      'recognizes Japanese animation as anime',
      () => {
        const japaneseLanguage = keys({
          genres: [16],
          language: 'ja',
        })

        const japaneseCountry = keys({
          genres: [16],
          language: 'en',
          countries: ['JP'],
        })

        const americanAnimation = keys({
          genres: [16],
          language: 'en',
          countries: ['US'],
        })

        assert.ok(
          japaneseLanguage.has(
            'taste:anime',
          ),
        )

        assert.ok(
          japaneseCountry.has(
            'taste:anime',
          ),
        )

        assert.equal(
          americanAnimation.has(
            'taste:anime',
          ),
          false,
        )
      },
    )

    it(
      'recognizes adult animation from explicit evidence',
      () => {
        const adult = keys({
          genres: [16, 35],
          keywords: [
            'adult animation',
          ],
        })

        const generic = keys({
          genres: [16, 35],
          keywords: [],
        })

        assert.ok(
          adult.has(
            'taste:adult-animation',
          ),
        )

        assert.equal(
          generic.has(
            'taste:adult-animation',
          ),
          false,
        )
      },
    )
  },
)
