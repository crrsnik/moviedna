import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildAchievementMetrics,
  watchedMediaForAchievements,
} from '../src/achievements/achievementMetrics.js'

function media(
  tmdbId,
  mediaType = 'movie',
  extra = {},
) {
  return {
    id: `${mediaType}_${tmdbId}`,
    tmdbId,
    mediaType,
    ...extra,
  }
}

function resolved(
  tmdbId,
  mediaType,
  {
    genres = [],
    releaseYear = null,
    countries = [],
    completeness = {},
  } = {},
) {
  return {
    mediaKey: `${mediaType}_${tmdbId}`,
    tmdbId,
    mediaType,
    metadata: {
      genres: genres.map(id => ({
        id,
        label: String(id),
      })),
      releaseYear,
      countries: countries.map(code => ({
        code,
        label: code,
      })),
      completeness: {
        genres: completeness.genres ?? true,
        releaseYear:
          completeness.releaseYear ?? releaseYear !== null,
        countries: completeness.countries ?? true,
      },
    },
  }
}

describe('achievement metrics', () => {
  it('builds empty metrics safely', () => {
    assert.deepEqual(
      buildAchievementMetrics(),
      {
        profile: {
          onboardingCompleted: false,
        },
        dna: {
          ready: false,
        },
        ratings: {
          total: 0,
        },
        watched: {
          total: 0,
          movies: 0,
          tv: 0,
          distinctGenres: 0,
          distinctDecades: 0,
          distinctCountries: 0,
          byGenre: {},
          maxDirectorTitles: 0,
          maxActorTitles: 0,
          pre1970: 0,
          maxGenreDecades: 0,
          genresWith10: 0,
          decadesWith10: 0,
          worldCinemaScholar: 0,
          directorJourney: 0,
          actorEras: 0,
          maxCollectionTitles: 0,
          globalNomad: 0,
        },
        favorites: {
          total: 0,
        },
        friends: {
          accepted: 0,
        },
        milestones: {
          longRoad: 0,
        },
      },
    )
  })

  it('counts unique ratings, watched titles and favorites', () => {
    const result = buildAchievementMetrics({
      ratings: [
        media(1),
        media(2),
        media(1),
        media(3, 'tv'),
      ],
      savedMedia: [
        media(1, 'movie', {
          watched: true,
          favorite: true,
        }),
        media(2, 'movie', {
          watched: true,
          favorite: false,
        }),
        media(3, 'tv', {
          watched: true,
          favorite: true,
        }),
        media(4, 'tv', {
          watched: false,
          favorite: true,
        }),
      ],
    })

    assert.equal(result.ratings.total, 3)
    assert.equal(result.watched.total, 3)
    assert.equal(result.watched.movies, 2)
    assert.equal(result.watched.tv, 1)
    assert.equal(result.favorites.total, 3)
  })

  it('builds genre, decade and country metrics from watched metadata', () => {
    const result = buildAchievementMetrics({
      savedMedia: [
        media(1, 'movie', { watched: true }),
        media(2, 'movie', { watched: true }),
        media(3, 'tv', { watched: true }),
      ],
      resolvedWatchedMedia: [
        resolved(1, 'movie', {
          genres: [27, 878],
          releaseYear: 1987,
          countries: ['US'],
        }),
        resolved(2, 'movie', {
          genres: [27, 35],
          releaseYear: 1999,
          countries: ['US', 'CA'],
        }),
        resolved(3, 'tv', {
          genres: [35],
          releaseYear: 2024,
          countries: ['GB'],
        }),
      ],
    })

    assert.equal(result.watched.distinctGenres, 3)
    assert.equal(result.watched.distinctDecades, 3)
    assert.equal(result.watched.distinctCountries, 3)

    assert.deepEqual(
      result.watched.byGenre,
      {
        27: 2,
        35: 2,
        878: 1,
      },
    )
  })

  it('does not count metadata from media that is not watched', () => {
    const result = buildAchievementMetrics({
      savedMedia: [
        media(1, 'movie', {
          watched: false,
          favorite: true,
        }),
      ],
      resolvedWatchedMedia: [
        resolved(1, 'movie', {
          genres: [27],
          releaseYear: 1980,
          countries: ['US'],
        }),
      ],
    })

    assert.equal(result.watched.total, 0)
    assert.equal(result.watched.distinctGenres, 0)
    assert.equal(result.watched.distinctDecades, 0)
    assert.equal(result.watched.distinctCountries, 0)
  })

  it('respects metadata completeness flags', () => {
    const result = buildAchievementMetrics({
      savedMedia: [
        media(1, 'movie', {
          watched: true,
        }),
      ],
      resolvedWatchedMedia: [
        resolved(1, 'movie', {
          genres: [27],
          releaseYear: 1980,
          countries: ['US'],
          completeness: {
            genres: false,
            releaseYear: false,
            countries: false,
          },
        }),
      ],
    })

    assert.equal(result.watched.distinctGenres, 0)
    assert.equal(result.watched.distinctDecades, 0)
    assert.equal(result.watched.distinctCountries, 0)
  })

  it('counts accepted unique friends only', () => {
    const result = buildAchievementMetrics({
      uid: 'alice',
      friendships: [
        {
          members: ['alice', 'bob'],
          status: 'accepted',
        },
        {
          members: ['alice', 'carol'],
          status: 'pending',
        },
        {
          members: ['alice', 'dave'],
          status: 'accepted',
        },
        {
          members: ['alice', 'bob'],
          status: 'accepted',
        },
        {
          members: ['eve', 'frank'],
          status: 'accepted',
        },
      ],
    })

    assert.equal(result.friends.accepted, 2)
  })

  it('derives foundation metrics from profile and DNA state', () => {
    const result = buildAchievementMetrics({
      profile: {
        onboardingCompleted: true,
      },
      dna: {
        status: 'ready',
      },
    })

    assert.equal(
      result.profile.onboardingCompleted,
      true,
    )
    assert.equal(result.dna.ready, true)
  })
})

describe('watched media achievement input', () => {
  it('returns only unique watched identities for metadata resolution', () => {
    assert.deepEqual(
      watchedMediaForAchievements([
        media(1, 'movie', { watched: true }),
        media(1, 'movie', { watched: true }),
        media(2, 'movie', { watched: false }),
        media(3, 'tv', { watched: true }),
      ]),
      [
        {
          mediaKey: 'movie_1',
          tmdbId: 1,
          mediaType: 'movie',
        },
        {
          mediaKey: 'tv_3',
          tmdbId: 3,
          mediaType: 'tv',
        },
      ],
    )
  })
})
