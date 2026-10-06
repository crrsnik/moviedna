import {
  ONBOARDING_CURATED_SEEDS,
} from '../../onboarding/services/onboardingCuratedCatalog.js'

import {
  getOnboardingMediaKey,
} from '../../onboarding/validation/onboardingValidation.js'


const FRANCHISE_BY_KEY = Object.freeze({
  // Movie universes / series already represented in onboarding.
  movie_603: 'matrix',
  movie_120: 'lotr',
  movie_155: 'batman',
  movie_329: 'jurassic',
  movie_348: 'alien',
  movie_218: 'terminator',
  movie_862: 'toy-story',
  movie_324857: 'spider-man',
  movie_438631: 'dune',

  // TV universes where a spin-off would add little new taste evidence.
  tv_1396: 'breaking-bad',
  tv_60059: 'breaking-bad',

  tv_1399: 'game-of-thrones',
  tv_94997: 'game-of-thrones',

  // Extra benchmark anchors.
  movie_24428: 'avengers',
  movie_11: 'star-wars',
  movie_671: 'harry-potter',
  movie_22: 'pirates-caribbean',
  movie_105: 'back-to-the-future',
})


export function getBenchmarkFranchiseByKey(
  mediaKey,
) {
  return typeof mediaKey === 'string'
    ? FRANCHISE_BY_KEY[mediaKey] ?? null
    : null
}


// Extra anchors deliberately favor established, widely-known titles.
// TMDb still supplies localized title/poster/overview at runtime.
export const DNA_REFINEMENT_EXTRA_SEEDS = Object.freeze([
  { mediaType: 'movie', tmdbId: 278 },       // The Shawshank Redemption
  { mediaType: 'movie', tmdbId: 424 },       // Schindler's List
  { mediaType: 'movie', tmdbId: 769 },       // Goodfellas
  { mediaType: 'movie', tmdbId: 807 },       // Se7en
  { mediaType: 'movie', tmdbId: 274 },       // The Silence of the Lambs
  { mediaType: 'movie', tmdbId: 857 },       // Saving Private Ryan
  { mediaType: 'movie', tmdbId: 105 },       // Back to the Future
  { mediaType: 'movie', tmdbId: 389 },       // 12 Angry Men
  { mediaType: 'movie', tmdbId: 1422 },      // The Departed
  { mediaType: 'movie', tmdbId: 1124 },      // The Prestige
  { mediaType: 'movie', tmdbId: 37799 },     // The Social Network
  { mediaType: 'movie', tmdbId: 313369 },    // La La Land
  { mediaType: 'movie', tmdbId: 12 },        // Finding Nemo
  { mediaType: 'movie', tmdbId: 10681 },     // WALL-E
  { mediaType: 'movie', tmdbId: 9806 },      // The Incredibles
  { mediaType: 'movie', tmdbId: 22 },        // Pirates of the Caribbean
  { mediaType: 'movie', tmdbId: 11 },        // Star Wars
  { mediaType: 'movie', tmdbId: 671 },       // Harry Potter
  { mediaType: 'movie', tmdbId: 24428 },     // The Avengers

  { mediaType: 'tv', tmdbId: 1398 },         // The Sopranos
  { mediaType: 'tv', tmdbId: 60625 },        // Rick and Morty
  { mediaType: 'tv', tmdbId: 1437 },         // Firefly
  { mediaType: 'tv', tmdbId: 4607 },         // Lost
  { mediaType: 'tv', tmdbId: 1408 },         // House
  { mediaType: 'tv', tmdbId: 44217 },        // Vikings
  { mediaType: 'tv', tmdbId: 62560 },        // Mr. Robot
  { mediaType: 'tv', tmdbId: 63351 },        // Narcos
  { mediaType: 'tv', tmdbId: 1416 },         // Grey's Anatomy
].map(Object.freeze))


const byKey = new Map()

for (const seed of [
  ...ONBOARDING_CURATED_SEEDS,
  ...DNA_REFINEMENT_EXTRA_SEEDS,
]) {
  const key = getOnboardingMediaKey(
    seed.mediaType,
    seed.tmdbId,
  )

  if (!key || byKey.has(key)) continue

  byKey.set(
    key,
    Object.freeze({
      ...seed,
      franchiseGroup:
        getBenchmarkFranchiseByKey(key),
    }),
  )
}


export const DNA_REFINEMENT_BENCHMARK_SEEDS = (
  Object.freeze([
    ...byKey.values(),
  ])
)
