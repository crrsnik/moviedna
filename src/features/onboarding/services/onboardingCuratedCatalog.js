import { TmdbError } from '../../catalog/services/tmdbErrors.js'
import {
  getOnboardingMediaSummary,
} from './onboardingCatalogService.js'
import {
  getOnboardingMediaKey,
} from '../validation/onboardingValidation.js'

export const ONBOARDING_CATALOG_SIZE = 20
export const ONBOARDING_CATALOG_CONCURRENCY = 4

// Deliberately interleaved across movie/TV, eras and broad genres.
// Titles are comments only: TMDB remains the source of localized metadata.
export const ONBOARDING_CURATED_SEEDS = Object.freeze([
  { mediaType: 'movie', tmdbId: 603 },    // The Matrix
  { mediaType: 'tv', tmdbId: 1396 },      // Breaking Bad
  { mediaType: 'movie', tmdbId: 597 },    // Titanic
  { mediaType: 'tv', tmdbId: 1668 },      // Friends
  { mediaType: 'movie', tmdbId: 129 },    // Spirited Away
  { mediaType: 'tv', tmdbId: 1399 },      // Game of Thrones
  { mediaType: 'movie', tmdbId: 680 },    // Pulp Fiction
  { mediaType: 'tv', tmdbId: 66732 },     // Stranger Things
  { mediaType: 'movie', tmdbId: 120 },    // The Lord of the Rings
  { mediaType: 'tv', tmdbId: 2316 },      // The Office
  { mediaType: 'movie', tmdbId: 496243 }, // Parasite
  { mediaType: 'tv', tmdbId: 87108 },     // Chernobyl
  { mediaType: 'movie', tmdbId: 862 },    // Toy Story
  { mediaType: 'tv', tmdbId: 19885 },     // Sherlock
  { mediaType: 'movie', tmdbId: 27205 },  // Inception
  { mediaType: 'tv', tmdbId: 246 },       // Avatar: The Last Airbender
  { mediaType: 'movie', tmdbId: 194 },    // Amélie
  { mediaType: 'tv', tmdbId: 42009 },     // Black Mirror
  { mediaType: 'movie', tmdbId: 155 },    // The Dark Knight
  { mediaType: 'tv', tmdbId: 71446 },     // Money Heist

  { mediaType: 'movie', tmdbId: 550 },    // Fight Club
  { mediaType: 'tv', tmdbId: 70523 },     // Dark
  { mediaType: 'movie', tmdbId: 238 },    // The Godfather
  { mediaType: 'tv', tmdbId: 60059 },     // Better Call Saul
  { mediaType: 'movie', tmdbId: 329 },    // Jurassic Park
  { mediaType: 'tv', tmdbId: 456 },       // The Simpsons
  { mediaType: 'movie', tmdbId: 13 },     // Forrest Gump
  { mediaType: 'tv', tmdbId: 76479 },     // The Boys
  { mediaType: 'movie', tmdbId: 348 },    // Alien
  { mediaType: 'tv', tmdbId: 82856 },     // The Mandalorian
  { mediaType: 'movie', tmdbId: 98 },     // Gladiator
  { mediaType: 'tv', tmdbId: 76331 },     // Succession
  { mediaType: 'movie', tmdbId: 8587 },   // The Lion King
  { mediaType: 'tv', tmdbId: 94605 },     // Arcane
  { mediaType: 'movie', tmdbId: 218 },    // The Terminator
  { mediaType: 'tv', tmdbId: 93405 },     // Squid Game
  { mediaType: 'movie', tmdbId: 105 },    // Back to the Future
  { mediaType: 'tv', tmdbId: 119051 },    // Wednesday
  { mediaType: 'movie', tmdbId: 77338 },  // The Intouchables
  { mediaType: 'tv', tmdbId: 100088 },    // The Last of Us

  { mediaType: 'movie', tmdbId: 101 },    // Léon
  { mediaType: 'tv', tmdbId: 94997 },     // House of the Dragon
  { mediaType: 'movie', tmdbId: 497 },    // The Green Mile
  { mediaType: 'tv', tmdbId: 1402 },      // The Walking Dead
  { mediaType: 'movie', tmdbId: 37165 },  // The Truman Show
  { mediaType: 'tv', tmdbId: 60574 },     // Peaky Blinders
  { mediaType: 'movie', tmdbId: 120467 }, // The Grand Budapest Hotel
  { mediaType: 'tv', tmdbId: 46648 },     // True Detective
  { mediaType: 'movie', tmdbId: 244786 }, // Whiplash
  { mediaType: 'tv', tmdbId: 1418 },      // The Big Bang Theory
  { mediaType: 'movie', tmdbId: 76341 },  // Mad Max: Fury Road
  { mediaType: 'tv', tmdbId: 1405 },      // Dexter
  { mediaType: 'movie', tmdbId: 419430 }, // Get Out
  { mediaType: 'tv', tmdbId: 1100 },      // How I Met Your Mother
  { mediaType: 'movie', tmdbId: 324857 }, // Spider-Man: Into the Spider-Verse
  { mediaType: 'tv', tmdbId: 1434 },      // Family Guy
  { mediaType: 'movie', tmdbId: 2062 },   // Ratatouille
  { mediaType: 'tv', tmdbId: 65494 },     // The Crown
  { mediaType: 'movie', tmdbId: 438631 }, // Dune
  { mediaType: 'movie', tmdbId: 545611 }, // Everything Everywhere All at Once
  { mediaType: 'movie', tmdbId: 872585 }, // Oppenheimer
  { mediaType: 'movie', tmdbId: 346698 }, // Barbie
].map(Object.freeze))

export function selectOnboardingSeeds(
  responses = [],
) {
  const seen = new Set(
    (Array.isArray(responses) ? responses : [])
      .map((response) => getOnboardingMediaKey(
        response?.mediaType,
        response?.tmdbId,
      ))
      .filter(Boolean),
  )

  return ONBOARDING_CURATED_SEEDS.filter((seed) => (
    !seen.has(
      getOnboardingMediaKey(
        seed.mediaType,
        seed.tmdbId,
      ),
    )
  ))
}

function isSkippableCatalogueError(error) {
  return (
    error instanceof TmdbError
    && (
      error.code === 'missing'
      || error.code === 'invalid'
    )
  )
}

export async function loadCuratedOnboardingCatalog({
  responses = [],
  language,
  signal,
  loadSummary = getOnboardingMediaSummary,
} = {}) {
  const seeds = selectOnboardingSeeds(responses)
  const result = []

  for (
    let index = 0;
    index < seeds.length
      && result.length < ONBOARDING_CATALOG_SIZE;
    index += ONBOARDING_CATALOG_CONCURRENCY
  ) {
    signal?.throwIfAborted()

    const batch = seeds.slice(
      index,
      index + ONBOARDING_CATALOG_CONCURRENCY,
    )

    const loaded = await Promise.all(
      batch.map(async (seed) => {
        try {
          return await loadSummary({
            ...seed,
            language,
            signal,
          })
        } catch (error) {
          if (isSkippableCatalogueError(error)) {
            return null
          }

          throw error
        }
      }),
    )

    for (const media of loaded) {
      if (media) result.push(media)

      if (
        result.length
        === ONBOARDING_CATALOG_SIZE
      ) {
        break
      }
    }
  }

  return result
}
