function watchedMediaKey(value) {
  if (
    !value
    || !['movie', 'tv'].includes(value.mediaType)
    || !Number.isSafeInteger(value.tmdbId)
    || value.tmdbId <= 0
  ) {
    return null
  }

  return `${value.mediaType}_${value.tmdbId}`
}

export function recommendationRevision(
  uid,
  dna,
  watched = [],
) {
  if (
    typeof uid !== 'string'
    || !uid
    || dna?.current?.status !== 'ready'
    || typeof dna.current.updatedAt !== 'string'
    || !dna.current.updatedAt
    || !Array.isArray(watched)
  ) {
    return null
  }

  const watchedKeys = [
    ...new Set(
      watched
        .map(watchedMediaKey)
        .filter(Boolean),
    ),
  ].sort()

  if (watchedKeys.length === 0) {
    return dna.current.updatedAt
  }

  return [
    dna.current.updatedAt,
    'watched',
    watchedKeys.join(','),
  ].join('|')
}
