const MAX_TRAITS = 4

const PREVIEW_DIMENSIONS = Object.freeze([
  ['genres', 'Genre'],
  ['mediaTypes', 'Format'],
  ['decades', 'Decade'],
  ['countries', 'Country'],
  ['directors', 'Director'],
  ['actors', 'Actor'],
])

function compareTraits(left, right) {
  const score = right.score - left.score
  if (score !== 0) return score

  const confidence = right.confidence - left.confidence
  if (confidence !== 0) return confidence

  const dimension = left.dimensionOrder - right.dimensionOrder
  if (dimension !== 0) return dimension

  return left.label.localeCompare(right.label)
}

function normalizeDimensionEntries(entries, dimension, category, dimensionOrder) {
  if (!Array.isArray(entries)) return []

  return entries
    .filter(entry => (
      entry
      && typeof entry.key === 'string'
      && entry.key
      && typeof entry.label === 'string'
      && entry.label.trim()
      && typeof entry.score === 'number'
      && Number.isFinite(entry.score)
      && entry.score > 0
      && entry.score <= 1
      && typeof entry.confidence === 'number'
      && Number.isFinite(entry.confidence)
      && entry.confidence >= 0
      && entry.confidence <= 1
    ))
    .map(entry => ({
      dimension,
      dimensionOrder,
      category,
      key: entry.key,
      label: entry.label.trim(),
      score: entry.score,
      confidence: entry.confidence,
    }))
    .sort(compareTraits)
}

export function selectDnaPreviewTraits(dimensions, limit = MAX_TRAITS) {
  if (!dimensions || typeof dimensions !== 'object' || limit <= 0) {
    return []
  }

  const groups = PREVIEW_DIMENSIONS.map(
    ([dimension, category], dimensionOrder) => (
      normalizeDimensionEntries(
        dimensions[dimension],
        dimension,
        category,
        dimensionOrder,
      )
    ),
  )

  const diverse = groups
    .filter(group => group.length)
    .map(group => group[0])
    .sort(compareTraits)
    .slice(0, limit)

  if (diverse.length >= limit) return diverse

  const selected = new Set(
    diverse.map(trait => `${trait.dimension}:${trait.key}`),
  )

  const remaining = groups
    .flat()
    .filter(trait => !selected.has(`${trait.dimension}:${trait.key}`))
    .sort(compareTraits)

  return [
    ...diverse,
    ...remaining.slice(0, limit - diverse.length),
  ]
}

export { MAX_TRAITS as DNA_PREVIEW_MAX_TRAITS }
