import assert from 'node:assert/strict'

import {
  describe,
  it,
} from 'node:test'

import {
  getRefinementCategories,
  getRefinementFranchise,
  selectBalancedRefinementMedia,
} from '../../src/features/dna/services/dnaRefinementCatalog.js'

import {
  DNA_REFINEMENT_BENCHMARK_SEEDS,
  getBenchmarkFranchiseByKey,
} from '../../src/features/dna/constants/dnaRefinementBenchmark.js'


function candidate({
  id,
  mediaType,
  year,
  genreIds,
  title = `Title ${id}`,
  voteCount = 12000,
}) {
  return {
    id,
    mediaType,
    title,
    overview: '',
    posterPath: null,
    backdropPath: null,
    releaseDate: `${year}-01-01`,
    voteAverage: 8,
    voteCount,
    genreIds,
    popularity: 100,
  }
}


describe(
  'DNA refinement candidate selection',
  () => {
    it(
      'rejects new and low-evidence titles',
      () => {
        const selected = (
          selectBalancedRefinementMedia(
            [
              candidate({
                id: 1,
                mediaType: 'movie',
                year: 2026,
                genreIds: [18],
              }),

              candidate({
                id: 2,
                mediaType: 'movie',
                year: 2010,
                genreIds: [18],
                voteCount: 100,
              }),

              candidate({
                id: 3,
                mediaType: 'movie',
                year: 2010,
                genreIds: [18],
              }),
            ],
            3,
            {
              currentYear: 2026,
            },
          )
        )

        assert.deepEqual(
          selected.map(
            media => media.id,
          ),
          [3],
        )
      },
    )


    it(
      'keeps a 20/20 movie-TV split when both pools are available',
      () => {
        const candidates = []

        for (
          let index = 0;
          index < 30;
          index += 1
        ) {
          candidates.push(
            candidate({
              id: index + 1,
              mediaType: 'movie',
              year:
                1995 + (index % 29),
              genreIds: [
                [28, 12],
                [35],
                [18],
                [80, 53],
                [878, 14],
                [27],
                [16, 10751],
                [10749],
              ][index % 8],
            }),
          )

          candidates.push(
            candidate({
              id: 1000 + index,
              mediaType: 'tv',
              year:
                1995 + (index % 29),
              genreIds: [
                [10759],
                [35],
                [18],
                [80, 9648],
                [10765],
                [9648],
                [16, 10751],
                [18, 35],
              ][index % 8],
            }),
          )
        }

        const selected = (
          selectBalancedRefinementMedia(
            candidates,
            40,
            {
              currentYear: 2026,
            },
          )
        )

        assert.equal(
          selected.length,
          40,
        )

        assert.equal(
          selected.filter(
            media => (
              media.mediaType
              === 'movie'
            ),
          ).length,
          20,
        )

        assert.equal(
          selected.filter(
            media => (
              media.mediaType
              === 'tv'
            ),
          ).length,
          20,
        )
      },
    )


    it(
      'allows only one title from the same franchise',
      () => {
        const selected = (
          selectBalancedRefinementMedia(
            [
              candidate({
                id: 1,
                mediaType: 'movie',
                year: 2012,
                genreIds: [28, 878],
                title: 'The Avengers',
              }),

              candidate({
                id: 2,
                mediaType: 'movie',
                year: 2018,
                genreIds: [28, 878],
                title:
                  'Avengers: Infinity War',
              }),

              candidate({
                id: 3,
                mediaType: 'movie',
                year: 2010,
                genreIds: [18],
                title: 'Standalone Drama',
              }),
            ],
            3,
            {
              currentYear: 2026,
            },
          )
        )

        assert.equal(
          selected.filter(
            media => (
              getRefinementFranchise(
                media,
              ) === 'avengers'
            ),
          ).length,
          1,
        )

        assert.equal(
          selected.length,
          2,
        )
      },
    )


    it(
      'respects a franchise already covered before refinement',
      () => {
        const selected = (
          selectBalancedRefinementMedia(
            [
              candidate({
                id: 1,
                mediaType: 'movie',
                year: 2018,
                genreIds: [28],
                title:
                  'Avengers: Infinity War',
              }),

              candidate({
                id: 2,
                mediaType: 'movie',
                year: 2014,
                genreIds: [18],
                title:
                  'Standalone Drama',
              }),
            ],
            2,
            {
              currentYear: 2026,
              blockedFranchises: [
                'avengers',
              ],
            },
          )
        )

        assert.deepEqual(
          selected.map(
            media => media.id,
          ),
          [2],
        )
      },
    )


    it(
      'groups related TV universes',
      () => {
        assert.equal(
          getRefinementFranchise({
            title: 'Breaking Bad',
          }),
          'breaking-bad',
        )

        assert.equal(
          getRefinementFranchise({
            title:
              'Better Call Saul',
          }),
          'breaking-bad',
        )

        assert.equal(
          getRefinementFranchise({
            title:
              'House of the Dragon',
          }),
          'game-of-thrones',
        )
      },
    )


    it(
      'recognizes broad genre groups',
      () => {
        const categories = (
          getRefinementCategories(
            candidate({
              id: 1,
              mediaType: 'movie',
              year: 2010,
              genreIds: [28, 878],
            }),
          )
        )

        assert.ok(
          categories.includes(
            'actionAdventure',
          ),
        )

        assert.ok(
          categories.includes(
            'sciFiFantasy',
          ),
        )
      },
    )


    it(
      'keeps a sufficiently large benchmark beyond the base onboarding',
      () => {
        assert.ok(
          DNA_REFINEMENT_BENCHMARK_SEEDS.length
            >= 80,
        )

        assert.equal(
          getBenchmarkFranchiseByKey(
            'movie_120',
          ),
          'lotr',
        )

        assert.equal(
          getBenchmarkFranchiseByKey(
            'tv_1396',
          ),
          'breaking-bad',
        )
      },
    )
  },
)
