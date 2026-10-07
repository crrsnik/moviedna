import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  calculateMovieDna,
} from '../../functions/src/dna/core/calculateMovieDna.js'

import {
  createRecommendationPipeline,
} from '../../functions/src/recommendations/recommendationPipeline.js'

function dnaItem(
  id,
  {
    genres,
    keywords = [],
    language = 'en',
    countries = ['US'],
    rating,
  },
) {
  return {
    mediaKey: `movie_${id}`,
    tmdbId: id,
    mediaType: 'movie',
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

      releaseYear: 2022,

      originalLanguage: {
        code: language,
        label: language,
      },

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
        originalLanguage: true,
        countries: true,
        people: true,
      },
    },
  }
}

function resolvedMetadata({
  genres,
  keywords = [],
  language = 'en',
  countries = ['US'],
}) {
  return {
    status: 'ready',

    genres: genres.map(id => ({
      id,
      label: String(id),
    })),

    keywords: keywords.map(
      (name, index) => ({
        id: 90000 + index,
        name,
      }),
    ),

    releaseYear: 2024,

    originalLanguage: {
      code: language,
      label: language,
    },

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
      originalLanguage: true,
      countries: true,
      people: true,
    },
  }
}

function sourceCandidate(id, title) {
  return {
    id,
    title,
    popularity: 50,
    poster_path: `/expanded-${id}.jpg`,
    release_date: '2024-01-15',
    vote_average: 7.5,
    vote_count: 2000,
  }
}

async function runScenario({
  tasteKey,
  evidence,
  matchingMetadata,
  genericMetadata,
  baseId,
}) {
  const dna = await calculateMovieDna({
    items: [
      dnaItem(
        baseId + 1,
        {
          ...evidence,
          rating: 10,
        },
      ),

      dnaItem(
        baseId + 2,
        {
          ...evidence,
          rating: 9,
        },
      ),

      dnaItem(
        baseId + 3,
        {
          ...evidence,
          rating: 9,
        },
      ),

      dnaItem(
        baseId + 4,
        {
          ...evidence,
          rating: 8,
        },
      ),
    ],
  })

  const matchingId = baseId + 101
  const genericId = baseId + 102

  const source = {
    source: 'expanded-taste-integration',
    mediaType: 'movie',

    results: [
      sourceCandidate(
        matchingId,
        'Matching Taste Candidate',
      ),

      sourceCandidate(
        genericId,
        'Generic Candidate',
      ),
    ],
  }

  function sourceFor(mediaType) {
    return {
      ...source,
      mediaType,
      results:
        mediaType === 'movie'
          ? source.results
          : [],
    }
  }

  const sourceClient = {
    async getTrending(mediaType) {
      return sourceFor(mediaType)
    },

    async getPopular(mediaType) {
      return sourceFor(mediaType)
    },

    async getTopRated(mediaType) {
      return sourceFor(mediaType)
    },

    async getRecommendations(mediaType) {
      return sourceFor(mediaType)
    },

    async discoverByGenre(mediaType) {
      return sourceFor(mediaType)
    },
  }

  const metadataResolver = {
    async resolve(candidates) {
      return candidates.map(candidate => ({
        ...candidate,

        metadata:
          candidate.tmdbId === matchingId
            ? resolvedMetadata(
                matchingMetadata,
              )
            : resolvedMetadata(
                genericMetadata,
              ),
      }))
    },
  }

  const pipeline =
    createRecommendationPipeline({
      sourceClient,
      metadataResolver,
      maxPerMediaType: 10,
    })

  const recommendation =
    await pipeline.run({
      dna,
      rated: [],
      seedSignals: [],
      watched: [],
      hidden: [],
    })

  const taste =
    dna.dimensions.tasteTags.find(
      entry => entry.key === tasteKey,
    )

  const matching =
    recommendation.results.find(
      result => (
        result.mediaKey
        === `movie_${matchingId}`
      ),
    )

  const generic =
    recommendation.results.find(
      result => (
        result.mediaKey
        === `movie_${genericId}`
      ),
    )

  return {
    dna,
    taste,
    matching,
    generic,
    recommendation,
  }
}

const scenarios = [
  {
    name: 'romantic comedy',
    tasteKey: 'taste:romantic-comedy',
    baseId: 8100,

    evidence: {
      genres: [35, 10749],
      keywords: ['romantic comedy'],
    },

    matchingMetadata: {
      genres: [35, 10749],
      keywords: ['romantic comedy'],
    },

    genericMetadata: {
      genres: [35, 10749],
      keywords: [],
    },
  },

  {
    name: 'mystery detective',
    tasteKey: 'taste:mystery-detective',
    baseId: 8200,

    evidence: {
      genres: [9648],
      keywords: ['detective'],
    },

    matchingMetadata: {
      genres: [9648],
      keywords: ['detective'],
    },

    genericMetadata: {
      genres: [9648],
      keywords: [],
    },
  },

  {
    name: 'dark fantasy',
    tasteKey: 'taste:dark-fantasy',
    baseId: 8300,

    evidence: {
      genres: [14],
      keywords: ['dark fantasy'],
    },

    matchingMetadata: {
      genres: [14],
      keywords: ['dark fantasy'],
    },

    genericMetadata: {
      genres: [14],
      keywords: [],
    },
  },

  {
    name: 'anime',
    tasteKey: 'taste:anime',
    baseId: 8400,

    // Same country for both candidates.
    // Only original language distinguishes
    // the semantic Anime taste here.
    evidence: {
      genres: [16],
      language: 'ja',
      countries: ['US'],
    },

    matchingMetadata: {
      genres: [16],
      language: 'ja',
      countries: ['US'],
    },

    genericMetadata: {
      genres: [16],
      language: 'en',
      countries: ['US'],
    },
  },
]

describe(
  'expanded taste recommendation flow',
  () => {
    for (const scenario of scenarios) {
      it(
        `carries ${scenario.name} taste from DNA into candidate ranking`,
        async () => {
          const {
            taste,
            matching,
            generic,
            recommendation,
          } = await runScenario(
            scenario,
          )

          assert.ok(
            taste,
            `DNA should infer ${scenario.tasteKey}`,
          )

          assert.ok(
            taste.strength > 0.9,
            `Expected strong ${scenario.tasteKey} evidence`,
          )

          assert.ok(matching)
          assert.ok(generic)

          assert.ok(
            matching.tasteMatch > 0,
          )

          assert.ok(
            matching.tasteAdjustment > 0,
          )

          assert.equal(
            generic.tasteAdjustment,
            0,
          )

          assert.ok(
            matching.score > generic.score,
          )

          assert.equal(
            recommendation.results[0]
              .mediaKey,
            matching.mediaKey,
          )
        },
      )
    }
  },
)
