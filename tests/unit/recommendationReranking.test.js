import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  rerankRecommendationResults,
} from '../../functions/src/recommendations/core/rerankRecommendationResults.js'


function result(id, {
  score = 80,
  genreContribution = 0.3,
} = {}) {
  return {
    mediaKey: `movie_${id}`,
    tmdbId: id,
    mediaType: 'movie',
    score,
    profileEvidenceCoverage: 0.8,
    popularity: 100,
    breakdown: [
      {
        dimension: 'genres',
        contribution: genreContribution,
      },
    ],
  }
}


function candidate(id, {
  mainstream = true,
  collectionId = null,
  directorId = id,
  genres = [28],
} = {}) {
  return {
    mediaKey: `movie_${id}`,
    tmdbId: id,
    mediaType: 'movie',
    popularity: mainstream ? 100 : 5,
    voteAverage: mainstream ? 7.8 : 6.4,
    voteCount: mainstream ? 20000 : 200,
    metadata: {
      genres: genres.map(genreId => ({
        id: genreId,
      })),
      directors: [{
        id: directorId,
      }],
      creators: [],
      collectionId,
    },
  }
}


describe('recommendation final reranking', () => {
  it('places up to fifteen mainstream-quality titles in the first twenty', () => {
    const mainstreamResults = Array.from(
      { length: 15 },
      (_, index) => result(index + 1),
    )

    const discoveryResults = Array.from(
      { length: 10 },
      (_, index) => result(index + 101, {
        score: 75 - index,
      }),
    )

    const results = [
      ...mainstreamResults,
      ...discoveryResults,
    ]

    const candidates = [
      ...Array.from(
        { length: 15 },
        (_, index) => candidate(index + 1),
      ),
      ...Array.from(
        { length: 10 },
        (_, index) => candidate(index + 101, {
          mainstream: false,
        }),
      ),
    ]

    const reranked =
      rerankRecommendationResults({
        rankedResults: results,
        candidates,
      })

    const mainstreamKeys = new Set(
      mainstreamResults.map(
        value => value.mediaKey,
      ),
    )

    assert.equal(
      reranked
        .slice(0, 20)
        .filter(value => (
          mainstreamKeys.has(
            value.mediaKey,
          )
        ))
        .length,
      15,
    )
  })


  it('avoids two movies from the same TMDb collection in the head when alternatives exist', () => {
    const results = Array.from(
      { length: 22 },
      (_, index) => result(index + 1),
    )

    const candidates = Array.from(
      { length: 22 },
      (_, index) => candidate(
        index + 1,
        {
          collectionId:
            index < 2
              ? 500
              : 1000 + index,
        },
      ),
    )

    const reranked =
      rerankRecommendationResults({
        rankedResults: results,
        candidates,
      })

    const head = reranked.slice(0, 20)

    const duplicatedFranchise =
      head.filter(value => (
        value.mediaKey === 'movie_1'
        || value.mediaKey === 'movie_2'
      ))

    assert.equal(
      duplicatedFranchise.length,
      1,
    )
  })


  it('keeps the complete reserve after composing the first twenty', () => {
    const results = Array.from(
      { length: 30 },
      (_, index) => result(index + 1),
    )

    const candidates = Array.from(
      { length: 30 },
      (_, index) => candidate(index + 1),
    )

    const reranked =
      rerankRecommendationResults({
        rankedResults: results,
        candidates,
      })

    assert.equal(reranked.length, 30)

    assert.deepEqual(
      new Set(
        reranked.map(
          value => value.mediaKey,
        ),
      ),
      new Set(
        results.map(
          value => value.mediaKey,
        ),
      ),
    )
  })
})
