export function sortDnaEntriesForDisplay(entries = []) {
  return [...entries].sort((left, right) => {
    const score = right.score - left.score
    if (score !== 0) return score

    const confidence = right.confidence - left.confidence
    if (confidence !== 0) return confidence

    return left.label.localeCompare(right.label)
  })
}
