export const RECOMMENDATION_ALGORITHM_VERSION = '1.5.0'
export const RECOMMENDATION_SCORE_MIN = 0
export const RECOMMENDATION_SCORE_MAX = 100
export const RECOMMENDATION_NEUTRAL_SCORE = 50

// TMDb quality is only a small prior.
// Personal MovieDNA affinity remains the dominant signal.
export const RECOMMENDATION_QUALITY_MAX_ADJUSTMENT = 6
export const RECOMMENDATION_QUALITY_BASELINE = 6.5
export const RECOMMENDATION_QUALITY_FULL_CONFIDENCE_VOTES = 50_000

// Specific taste is a bounded refinement layer.
// It can distinguish candidates with the same broad DNA fit,
// but it cannot overpower the whole recommendation formula.
export const RECOMMENDATION_TASTE_MAX_ADJUSTMENT = 12

export const RECOMMENDATION_DIMENSION_WEIGHTS = Object.freeze({
  genres: 0.55,
  mediaTypes: 0.05,
  decades: 0.07,
  countries: 0.05,
  actors: 0.13,
  directors: 0.15,
  creators: 0.15,
})

export const RECOMMENDATION_ROUNDING_DECIMALS = 6
