export const MOVIEDNA_ALGORITHM_VERSION = '1.0.0'

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
export const MOVIEDNA_ROUNDING_DECIMALS = 6
