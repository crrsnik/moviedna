function searchableText(value) {
  return typeof value === 'string'
    ? value
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLocaleLowerCase()
        .trim()
        .replace(/\s+/gu, ' ')
    : ''
}


function resultLabel(result) {
  return result?.mediaType === 'person'
    ? result.name
    : result?.title
}


function relevanceTier(result, query) {
  const label = searchableText(
    resultLabel(result),
  )

  const needle = searchableText(query)

  if (!label || !needle) return 0

  if (label === needle) {
    return 4
  }

  if (label.startsWith(needle)) {
    return 3
  }

  const words = label.split(
    /[\s:;,.!?()[\]{}'"“”‘’/\\|+–—_-]+/u,
  )

  if (
    words.some(
      word => word.startsWith(needle),
    )
  ) {
    return 2
  }

  if (label.includes(needle)) {
    return 1
  }

  return 0
}


function popularity(result) {
  return (
    typeof result?.popularity === 'number'
    && Number.isFinite(result.popularity)
    && result.popularity >= 0
  )
    ? result.popularity
    : 0
}


function voteCount(result) {
  return Number.isSafeInteger(
    result?.voteCount,
  ) && result.voteCount >= 0
    ? result.voteCount
    : 0
}


function voteAverage(result) {
  return (
    typeof result?.voteAverage === 'number'
    && Number.isFinite(result.voteAverage)
  )
    ? result.voteAverage
    : 0
}


function stableIdentity(result) {
  return `${
    result?.mediaType ?? ''
  }:${
    result?.id ?? ''
  }`
}


export function rankSearchResults(
  results,
  query,
) {
  if (!Array.isArray(results)) {
    throw new TypeError(
      'Search results must be an array.',
    )
  }

  return [...results].sort((a, b) => (
    relevanceTier(b, query)
      - relevanceTier(a, query)
    || popularity(b) - popularity(a)
    || voteCount(b) - voteCount(a)
    || voteAverage(b) - voteAverage(a)
    || searchableText(resultLabel(a))
      .localeCompare(
        searchableText(resultLabel(b)),
      )
    || stableIdentity(a)
      .localeCompare(stableIdentity(b))
  ))
}
