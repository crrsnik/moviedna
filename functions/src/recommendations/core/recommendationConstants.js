export const RECOMMENDATION_ALGORITHM_VERSION = '1.1.0'
export const RECOMMENDATION_SCORE_MIN = 0
export const RECOMMENDATION_SCORE_MAX = 100
export const RECOMMENDATION_NEUTRAL_SCORE = 50

export const RECOMMENDATION_DIMENSION_WEIGHTS = Object.freeze({
  genres: 0.32,
  mediaTypes: 0.05,
  decades: 0.14,
  languages: 0.09,
  countries: 0.12,
  actors: 0.14,
  directors: 0.14,
  creators: 0.14,
})

export const RECOMMENDATION_ROUNDING_DECIMALS = 6
