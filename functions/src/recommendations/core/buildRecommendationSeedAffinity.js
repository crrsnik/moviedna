function positiveInteger(value) {
  return Number.isSafeInteger(value)
    && value > 0
}

function validMediaType(value) {
  return value === 'movie'
    || value === 'tv'
}

function candidateKey(
  mediaType,
  tmdbId,
) {
  if (
    !validMediaType(mediaType)
    || !positiveInteger(tmdbId)
  ) {
    return null
  }

  return `${mediaType}_${tmdbId}`
}

function positionWeight(index) {
  if (
    !Number.isSafeInteger(index)
    || index < 0
  ) {
    return 0
  }

  return 1 / Math.sqrt(index + 1)
}

function sourceSeedKey(source) {
  if (typeof source !== 'string') {
    return null
  }

  const match = source.match(
    /^seed:(movie|tv)_([1-9]\d*):[1-9]\d*$/,
  )

  if (!match) return null

  return `${match[1]}_${match[2]}`
}

export function buildRecommendationSeedAffinity({
  seeds = [],
  sources = [],
} = {}) {
  if (
    !Array.isArray(seeds)
    || !Array.isArray(sources)
  ) {
    return new Map()
  }

  const seedByMediaKey = new Map(
    seeds
      .filter(seed => (
        seed
        && typeof seed === 'object'
        && typeof seed.mediaKey === 'string'
        && typeof seed.weight === 'number'
        && Number.isFinite(seed.weight)
        && seed.weight > 0
        && seed.weight <= 1
      ))
      .map(seed => [
        seed.mediaKey,
        seed,
      ]),
  )

  const evidenceByCandidate =
    new Map()

  for (const source of sources) {
    if (
      !source
      || typeof source !== 'object'
      || !Array.isArray(source.results)
      || !validMediaType(
        source.mediaType,
      )
    ) {
      continue
    }

    const seedMediaKey =
      sourceSeedKey(source.source)

    const seed =
      seedByMediaKey.get(seedMediaKey)

    if (!seed) continue

    for (
      let index = 0;
      index < source.results.length;
      index += 1
    ) {
      const item =
        source.results[index]

      const mediaKey = candidateKey(
        source.mediaType,
        item?.id,
      )

      if (!mediaKey) continue

      const signal =
        seed.weight
        * positionWeight(index)

      const current =
        evidenceByCandidate.get(
          mediaKey,
        ) ?? new Map()

      const previous =
        current.get(seed.mediaKey) ?? 0

      if (signal > previous) {
        current.set(
          seed.mediaKey,
          signal,
        )
      }

      evidenceByCandidate.set(
        mediaKey,
        current,
      )
    }
  }

  const result = new Map()

  for (
    const [
      mediaKey,
      evidence,
    ]
    of evidenceByCandidate
  ) {
    const signals = [
      ...evidence.values(),
    ].sort((a, b) => b - a)

    const strongest =
      signals[0] ?? 0

    const additionalSupport =
      Math.min(
        0.30,
        Math.max(
          0,
          signals.length - 1,
        ) * 0.10,
      )

    const affinity = Math.min(
      1,
      strongest
        + additionalSupport
          * (1 - strongest),
    )

    result.set(
      mediaKey,
      Object.freeze({
        affinity,
        seedCount:
          signals.length,
      }),
    )
  }

  return result
}
