import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  rankRecommendations,
} from '../../functions/src/recommendations/core/rankRecommendations.js'

function dnaEntry(
  key,
  score = 1,
  confidence = 1,
) {
  return {
    key,
    label: key,
    score,
    confidence,
  }
}

function tasteEntry(
  key,
  strength,
) {
  return {
    key,
    label: key,
    score: strength,
    confidence: 1,
    affinity: strength,
    strength,
  }
}

function profile({
  psychological = null,
  crime = null,
} = {}) {
  const tasteTags = []

  if (psychological !== null) {
    tasteTags.push(
      tasteEntry(
        'taste:psychological-thriller',
        psychological,
      ),
    )
  }

  if (crime !== null) {
    tasteTags.push(
      tasteEntry(
        'taste:crime-thriller',
        crime,
      ),
    )
  }

  return {
    schemaVersion: 1,
    algorithmVersion: '1.0.0',
    dimensions: {
      genres: [
        dnaEntry('genre:53'),
      ],
      mediaTypes: [],
      decades: [],
      languages: [],
      countries: [],
      directors: [],
      creators: [],
      actors: [],
      tasteTags,
    },
  }
}

function candidate(
  id,
  tasteTags = [],
) {
  return {
    tmdbId: id,
    mediaType: 'movie',
    title: `Movie ${id}`,
    popularity: 10,
    voteAverage: null,
    voteCount: 0,
    metadata: {
      genreIds: [53],
      tasteTags,
    },
  }
}

function psychologicalCandidate(id = 1) {
  return candidate(
    id,
    [
      {
        key: 'taste:psychological-thriller',
        label: 'Psychological Thriller',
      },
    ],
  )
}

function genericCandidate(id = 2) {
  return candidate(id, [])
}

describe(
  'recommendation taste-aware ranking',
  () => {
    it(
      'boosts psychological thriller for a matching viewer',
      () => {
        const results = rankRecommendations({
          dna: profile({
            psychological: 1,
          }),
          candidates: [
            genericCandidate(2),
            psychologicalCandidate(1),
          ],
        }).results

        assert.equal(
          results[0].mediaKey,
          'movie_1',
        )

        assert.equal(
          results[0].tasteMatch,
          1,
        )

        assert.equal(
          results[0].tasteAdjustment,
          12,
        )

        assert.equal(
          results[0].tasteEvidenceCount,
          1,
        )

        assert.equal(
          results[0].score,
          89.5,
        )

        assert.equal(
          results[1].score,
          77.5,
        )
      },
    )

    it(
      'penalizes psychological thriller when that taste is disliked',
      () => {
        const results = rankRecommendations({
          dna: profile({
            psychological: -1,
          }),
          candidates: [
            psychologicalCandidate(1),
            genericCandidate(2),
          ],
        }).results

        assert.equal(
          results[0].mediaKey,
          'movie_2',
        )

        const psychological =
          results.find(
            result => (
              result.mediaKey === 'movie_1'
            ),
          )

        assert.ok(psychological)

        assert.equal(
          psychological.tasteMatch,
          -1,
        )

        assert.equal(
          psychological.tasteAdjustment,
          -12,
        )

        assert.equal(
          psychological.score,
          65.5,
        )
      },
    )

    it(
      'scales taste adjustment with confidence-aware strength',
      () => {
        const result = rankRecommendations({
          dna: profile({
            psychological: 0.25,
          }),
          candidates: [
            psychologicalCandidate(1),
          ],
        }).results[0]

        assert.equal(
          result.tasteMatch,
          0.25,
        )

        assert.equal(
          result.tasteAdjustment,
          3,
        )

        assert.equal(
          result.score,
          80.5,
        )
      },
    )

    it(
      'keeps taste adjustment bounded when multiple positive tags match',
      () => {
        const result = rankRecommendations({
          dna: profile({
            psychological: 1,
            crime: 1,
          }),
          candidates: [
            candidate(
              1,
              [
                {
                  key: 'taste:psychological-thriller',
                  label: 'Psychological Thriller',
                },
                {
                  key: 'taste:crime-thriller',
                  label: 'Crime Thriller',
                },
              ],
            ),
          ],
        }).results[0]

        assert.equal(
          result.tasteMatch,
          1,
        )

        assert.equal(
          result.tasteAdjustment,
          12,
        )

        assert.equal(
          result.tasteEvidenceCount,
          2,
        )
      },
    )

    it(
      'lets conflicting specific tastes cancel',
      () => {
        const result = rankRecommendations({
          dna: profile({
            psychological: 1,
            crime: -1,
          }),
          candidates: [
            candidate(
              1,
              [
                {
                  key: 'taste:psychological-thriller',
                  label: 'Psychological Thriller',
                },
                {
                  key: 'taste:crime-thriller',
                  label: 'Crime Thriller',
                },
              ],
            ),
          ],
        }).results[0]

        assert.equal(
          result.tasteMatch,
          0,
        )

        assert.equal(
          result.tasteAdjustment,
          0,
        )

        assert.equal(
          result.tasteEvidenceCount,
          2,
        )
      },
    )

    it(
      'keeps old DNA and old candidates backward compatible',
      () => {
        const dna = profile()

        delete dna.dimensions.tasteTags

        const result = rankRecommendations({
          dna,
          candidates: [
            {
              tmdbId: 1,
              mediaType: 'movie',
              title: 'Old Candidate',
              popularity: 10,
              voteAverage: null,
              voteCount: 0,
              metadata: {
                genreIds: [53],
              },
            },
          ],
        }).results[0]

        assert.equal(
          result.score,
          77.5,
        )

        assert.equal(
          result.tasteMatch,
          0,
        )

        assert.equal(
          result.tasteAdjustment,
          0,
        )

        assert.equal(
          result.tasteEvidenceCount,
          0,
        )
      },
    )
  },
)
