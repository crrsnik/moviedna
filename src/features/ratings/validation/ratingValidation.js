import { getMediaKey, normalizeMediaSnapshot } from '../../library/validation/libraryValidation.js'
import { RatingError } from '../services/ratingErrors.js'
export function validateScore(score) {
  if (!Number.isInteger(score) || score < 1 || score > 10) throw new RatingError('invalid-score')
  return score
}
export function validateRatingKey(key) {
  try {
    if (typeof key !== 'string') throw new Error()
    const [type, id, extra] = key.split('_')
    if (extra !== undefined || getMediaKey(type, Number(id)) !== key) throw new Error()
    return key
  } catch { throw new RatingError('invalid-media') }
}
export function ratingMediaSnapshot(input) {
  try { return normalizeMediaSnapshot(input) } catch { throw new RatingError('invalid-media') }
}
