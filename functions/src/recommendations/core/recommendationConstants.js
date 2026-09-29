export const RECOMMENDATION_ALGORITHM_VERSION = '1.0.0'
export const RECOMMENDATION_SCORE_MIN = 0
export const RECOMMENDATION_SCORE_MAX = 100
export const RECOMMENDATION_NEUTRAL_SCORE = 50

export const RECOMMENDATION_DIMENSION_WEIGHTS = Object.freeze({
  genres: 0.30,
  mediaTypes: 0.15,
  decades: 0.12,
  languages: 0.10,
  countries: 0.10,
  actors: 0.08,
  directors: 0.15,
  creators: 0.15,
})

export const RECOMMENDATION_ROUNDING_DECIMALS = 6
