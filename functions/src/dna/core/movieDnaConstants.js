export const MOVIEDNA_SCHEMA_VERSION = 1
export const MOVIEDNA_ALGORITHM_VERSION = '1.0.0'
export const MOVIEDNA_CALCULATION_REVISION = 3

export const RATING_WEIGHTS = Object.freeze({
  1: -1,
  2: -0.75,
  3: -0.5,
  4: -0.25,
  5: 0,
  6: 0.2,
  7: 0.4,
  8: 0.6,
  9: 0.8,
  10: 1,
})

export const ONBOARDING_WEIGHTS = Object.freeze({
  like: 0.35,
  dislike: -0.35,
  skip: 0,
})

export const FAVORITE_WEIGHT = 0.2
export const ACTOR_WEIGHT_MULTIPLIER = 0.5

// Relative diagnostic specificity of TMDB genres.
//
// These weights do NOT mean that one genre is better or more important
// than another. They describe how informative a genre is when identifying
// a user's taste. Broad umbrella genres receive less weight, while narrower
// genres receive more.
//
// Per-title weights are normalized before they are added to DNA, so the
// total evidence contributed by one title remains unchanged.
export const DEFAULT_GENRE_SPECIFICITY_WEIGHT = 1

export const GENRE_SPECIFICITY_WEIGHTS = Object.freeze({
  // Movie + shared genres
  12: 0.9,      // Adventure
  14: 1.05,     // Fantasy
  16: 1.0,      // Animation
  18: 0.65,     // Drama
  27: 1.15,     // Horror
  28: 0.85,     // Action
  35: 0.75,     // Comedy
  36: 1.1,      // History
  37: 1.2,      // Western
  53: 1.15,     // Thriller
  80: 1.05,     // Crime
  99: 1.2,      // Documentary
  878: 1.1,     // Science Fiction
  9648: 1.2,    // Mystery
  10402: 1.15,  // Music
  10749: 1.0,   // Romance
  10751: 0.95,  // Family
  10752: 1.15,  // War
  10770: 0.85,  // TV Movie

  // TV-specific genres
  10759: 0.9,   // Action & Adventure
  10762: 1.1,   // Kids
  10763: 1.2,   // News
  10764: 1.1,   // Reality
  10765: 1.05,  // Sci-Fi & Fantasy
  10766: 1.15,  // Soap
  10767: 1.15,  // Talk
  10768: 1.15,  // War & Politics
})

export const MOVIEDNA_ROUNDING_DECIMALS = 6
