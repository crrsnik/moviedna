export const RECOMMENDATION_ALGORITHM_VERSION = '1.2.0'
export const RECOMMENDATION_SCORE_MIN = 0
export const RECOMMENDATION_SCORE_MAX = 100
export const RECOMMENDATION_NEUTRAL_SCORE = 50

export const RECOMMENDATION_DIMENSION_WEIGHTS = Object.freeze({
  genres: 0.35,
  mediaTypes: 0.05,
  decades: 0.15,
  countries: 0.13,
  actors: 0.16,
  directors: 0.16,
  creators: 0.16,
})

export const RECOMMENDATION_ROUNDING_DECIMALS = 6
