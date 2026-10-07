import {
  RECOMMENDATION_ALGORITHM_VERSION,
  RECOMMENDATION_DIMENSION_WEIGHTS,
  RECOMMENDATION_NEUTRAL_SCORE,
  RECOMMENDATION_QUALITY_BASELINE,
  RECOMMENDATION_QUALITY_FULL_CONFIDENCE_VOTES,
  RECOMMENDATION_QUALITY_MAX_ADJUSTMENT,
  RECOMMENDATION_ROUNDING_DECIMALS,
  RECOMMENDATION_SCORE_MAX,
  RECOMMENDATION_SCORE_MIN,
  RECOMMENDATION_TASTE_MAX_ADJUSTMENT,
} from './recommendationConstants.js'
import { RECOMMENDATION_ERROR_CODES, throwRecommendationError } from './recommendationErrors.js'

const MEDIA_TYPES = new Set(['movie', 'tv'])
const COMMON_DIMENSIONS = ['genres', 'mediaTypes', 'decades', 'countries', 'actors']
const DIMENSION_ORDER = ['genres', 'mediaTypes', 'decades', 'countries', 'directors', 'creators', 'actors']
const DNA_KEY_PATTERNS = Object.freeze({
  genres: /^genre:[1-9]\d*$/,
  mediaTypes: /^media:(movie|tv)$/,
  decades: /^decade:(18|19|20|21)\d0$/,
  countries: /^country:[A-Z]{2}$/,
  directors: /^person:[1-9]\d*$/,
  creators: /^person:[1-9]\d*$/,
  actors: /^person:[1-9]\d*$/,
})
const REASON_LABELS = Object.freeze({
  genres: 'genre', mediaTypes: 'movie and TV', decades: 'era',
  countries: 'country', directors: 'director', creators: 'creator', actors: 'cast',
})

function plain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function positiveInteger(value) { return Number.isSafeInteger(value) && value > 0 }
function finite(value, min, max) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max }
function round(value, decimals = RECOMMENDATION_ROUNDING_DECIMALS) {
  const result = Number(value.toFixed(decimals))
  return Object.is(result, -0) ? 0 : result
}
function uniqueSorted(values, compare = (a, b) => a.localeCompare(b)) { return [...new Set(values)].sort(compare) }

export function recommendationMediaKey(mediaType, tmdbId) {
  if (!MEDIA_TYPES.has(mediaType) || !positiveInteger(tmdbId)) return null
  return `${mediaType}_${tmdbId}`
}

const TASTE_KEY_PATTERN =
  /^taste:[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizeDna(dna) {
  if (!plain(dna) || dna.schemaVersion !== 1 || dna.algorithmVersion !== '1.0.0' || !plain(dna.dimensions)) {
    throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_DNA)
  }
  const index = {}
  for (const dimension of DIMENSION_ORDER) {
    const entries = dna.dimensions[dimension] ?? []
    if (!Array.isArray(entries)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_DNA)
    const values = new Map()
    for (const entry of entries) {
      if (!plain(entry) || typeof entry.key !== 'string' || !entry.key
        || !DNA_KEY_PATTERNS[dimension].test(entry.key)
        || !finite(entry.score, -1, 1) || !finite(entry.confidence, 0, 1)) continue
      if (values.has(entry.key)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_DNA)
      values.set(entry.key, round(entry.score * entry.confidence))
    }
    index[dimension] = values
  }

  const tasteEntries =
    dna.dimensions.tasteTags ?? []

  if (!Array.isArray(tasteEntries)) {
    throwRecommendationError(
      RECOMMENDATION_ERROR_CODES.INVALID_DNA,
    )
  }

  const tasteValues = new Map()

  for (const entry of tasteEntries) {
    if (
      !plain(entry)
      || typeof entry.key !== 'string'
      || !TASTE_KEY_PATTERN.test(entry.key)
    ) {
      continue
    }

    let strength = null

    if (
      finite(
        entry.strength,
        -1,
        1,
      )
    ) {
      strength = entry.strength
    } else if (
      finite(
        entry.affinity,
        -1,
        1,
      )
      && finite(
        entry.confidence,
        0,
        1,
      )
    ) {
      strength =
        entry.affinity
        * entry.confidence
    }

    if (strength === null) {
      continue
    }

    if (tasteValues.has(entry.key)) {
      throwRecommendationError(
        RECOMMENDATION_ERROR_CODES.INVALID_DNA,
      )
    }

    tasteValues.set(
      entry.key,
      round(strength),
    )
  }

  index.tasteTags = tasteValues

  return index
}

function normalizeIntegerList(value, maximum = 20) {
  if (value === undefined) return { available: false, values: [] }
  if (!Array.isArray(value) || value.length > maximum || value.some((item) => !positiveInteger(item))) return null
  return { available: true, values: uniqueSorted(value, (a, b) => a - b) }
}

function normalizeCodeList(value) {
  if (value === undefined) return { available: false, values: [] }
  if (!Array.isArray(value) || value.length > 20 || value.some((item) => typeof item !== 'string' || !/^[A-Z]{2}$/.test(item))) return null
  return { available: true, values: uniqueSorted(value) }
}

function normalizePeople(value, maximum) {
  if (value === undefined) return { available: false, values: [] }
  if (!Array.isArray(value) || value.length > maximum) return null
  const ids = value.map((person) => plain(person) ? person.id : person)
  if (ids.some((id) => !positiveInteger(id))) return null
  return { available: true, values: uniqueSorted(ids, (a, b) => a - b) }
}

function normalizeTasteTags(value) {
  if (value === undefined) {
    return {
      available: false,
      keys: [],
    }
  }

  if (
    !Array.isArray(value)
    || value.length > 50
  ) {
    return null
  }

  const keys = []

  for (const item of value) {
    const key = plain(item)
      ? item.key
      : item

    if (
      typeof key !== 'string'
      || !TASTE_KEY_PATTERN.test(key)
    ) {
      return null
    }

    keys.push(key)
  }

  return {
    available: true,
    keys: uniqueSorted(keys),
  }
}

function normalizeCandidate(value) {
  if (!plain(value)) return null
  const mediaKey = recommendationMediaKey(value.mediaType, value.tmdbId)
  if (!mediaKey || (value.mediaKey !== undefined && value.mediaKey !== mediaKey)) return null
  const metadata = value.metadata
  if (metadata !== undefined && !plain(metadata)) return null
  const source = metadata ?? {}
  const genres = normalizeIntegerList(source.genreIds)
  const countries = normalizeCodeList(source.countryCodes)
  const directors = normalizePeople(source.directors, 10)
  const creators = normalizePeople(source.creators, 10)
  const actors = normalizePeople(source.actors, 20)
  const tasteTags =
    normalizeTasteTags(source.tasteTags)

  if (
    !genres
    || !countries
    || !directors
    || !creators
    || !actors
    || !tasteTags
  ) return null
  if (value.mediaType === 'movie' && creators.values.length) return null
  if (value.mediaType === 'tv' && directors.values.length) return null
  const releaseYear = source.releaseYear
  if (releaseYear !== undefined && releaseYear !== null
    && (!Number.isInteger(releaseYear) || releaseYear < 1800 || releaseYear > 2200)) return null
  const popularity = value.popularity ?? 0

  if (
    typeof popularity !== 'number'
    || !Number.isFinite(popularity)
    || popularity < 0
  ) return null

  const voteAverage = value.voteAverage ?? null
  const voteCount = value.voteCount ?? 0

  if (
    voteAverage !== null
    && !finite(voteAverage, 0, 10)
  ) return null

  if (
    !Number.isSafeInteger(voteCount)
    || voteCount < 0
  ) return null

  return {
    mediaKey, tmdbId: value.tmdbId, mediaType: value.mediaType,
    title: typeof value.title === 'string' && value.title.trim() ? value.title.trim() : null,
    popularity,
    voteAverage,
    voteCount,
    tasteTags,
    features: {
      genres: { available: genres.available, keys: genres.values.map((id) => `genre:${id}`) },
      mediaTypes: { available: true, keys: [`media:${value.mediaType}`] },
      decades: { available: releaseYear !== undefined && releaseYear !== null, keys: releaseYear == null ? [] : [`decade:${Math.floor(releaseYear / 10) * 10}`] },
      countries: { available: countries.available, keys: countries.values.map((code) => `country:${code}`) },
      directors: { available: directors.available, keys: directors.values.map((id) => `person:${id}`) },
      creators: { available: creators.available, keys: creators.values.map((id) => `person:${id}`) },
      actors: { available: actors.available, keys: actors.values.map((id) => `person:${id}`) },
    },
  }
}

function applicableDimensions(mediaType) {
  return [...COMMON_DIMENSIONS, mediaType === 'movie' ? 'directors' : 'creators']
}

function dimensionEvidence(
  dnaDimension,
  feature,
  {
    matchedOnly = false,
  } = {},
) {
  if (
    !feature.available
    || feature.keys.length === 0
  ) {
    return {
      match: 0,
      coverage: 0,
      hasEvidence: false,
    }
  }

  let matchedCount = 0

  const total = feature.keys.reduce(
    (sum, key) => {
      if (!dnaDimension.has(key)) {
        return sum
      }

      matchedCount += 1

      return (
        sum
        + dnaDimension.get(key)
      )
    },
    0,
  )

  const denominator = (
    matchedOnly
    && matchedCount > 0
  )
    ? matchedCount
    : feature.keys.length

  return {
    match: round(
      total / denominator,
    ),
    coverage: round(
      matchedCount
        / feature.keys.length,
    ),
    hasEvidence:
      matchedCount > 0,
  }
}

function tasteEvidence(
  dnaTasteTags,
  candidateTasteTags,
) {
  if (
    !candidateTasteTags.available
    || candidateTasteTags.keys.length === 0
  ) {
    return {
      match: 0,
      matchedCount: 0,
      hasEvidence: false,
    }
  }

  const matched =
    candidateTasteTags.keys.filter(
      key => dnaTasteTags.has(key),
    )

  if (!matched.length) {
    return {
      match: 0,
      matchedCount: 0,
      hasEvidence: false,
    }
  }

  const total = matched.reduce(
    (sum, key) => (
      sum + dnaTasteTags.get(key)
    ),
    0,
  )

  return {
    match: round(
      total / matched.length,
    ),
    matchedCount: matched.length,
    hasEvidence: true,
  }
}

function recommendationQualityAdjustment(candidate) {
  if (
    candidate.voteAverage === null
    || candidate.voteCount <= 0
  ) {
    return 0
  }

  const confidence = Math.min(
    1,
    Math.log10(candidate.voteCount + 1)
      / Math.log10(
        RECOMMENDATION_QUALITY_FULL_CONFIDENCE_VOTES + 1,
      ),
  )

  const qualitySignal = Math.max(
    -1,
    Math.min(
      1,
      (
        candidate.voteAverage
        - RECOMMENDATION_QUALITY_BASELINE
      ) / 3.5,
    ),
  )

  return round(
    RECOMMENDATION_QUALITY_MAX_ADJUSTMENT
      * qualitySignal
      * confidence,
  )
}


function explanationReasons(breakdown) {
  const ranked = breakdown
    .filter((entry) => entry.contribution !== 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
      || DIMENSION_ORDER.indexOf(a.dimension) - DIMENSION_ORDER.indexOf(b.dimension))
    .slice(0, 3)
  if (!ranked.length) return ['Limited preference evidence for this title.']
  return ranked.map((entry) => entry.contribution > 0
    ? `Strong ${REASON_LABELS[entry.dimension]} match.`
    : `Some ${REASON_LABELS[entry.dimension]} signals are a weaker fit.`)
}

function genreContribution(result) {
  return (
    result.breakdown.find(
      entry => (
        entry.dimension === 'genres'
      ),
    )?.contribution
    ?? 0
  )
}


function familiarityAdjustment(candidate) {
  if (!candidate) return 0

  const voteCount = (
    Number.isSafeInteger(
      candidate.voteCount,
    )
    && candidate.voteCount > 0
  )
    ? candidate.voteCount
    : 0

  const popularity = (
    typeof candidate.popularity
      === 'number'
    && Number.isFinite(
      candidate.popularity,
    )
    && candidate.popularity > 0
  )
    ? candidate.popularity
    : 0

  // voteCount approximates long-term recognition,
  // popularity adds a smaller current-awareness signal.
  const voteSignal = Math.min(
    1,
    Math.log10(voteCount + 1)
      / 5,
  )

  const popularitySignal = Math.min(
    1,
    Math.log10(popularity + 1)
      / Math.log10(201),
  )

  return (
    12
    * (
      voteSignal * 0.7
      + popularitySignal * 0.3
    )
  )
}


function genreFocusedRank(
  result,
  candidate,
) {
  return (
    result.score

    // Genre is deliberately the strongest reranking signal.
    // Max genre contribution 0.35 => +10.5 rank points.
    + 30
      * genreContribution(result)

    // Familiar titles get at most +4 points.
    + familiarityAdjustment(
      candidate,
    )
  )
}


function rankCandidate(candidate, dna) {
  const dimensions = applicableDimensions(candidate.mediaType)
  let affinity = 0
  let coveredWeight = 0
  let evidenceWeight = 0
  let hasPersonalizationEvidence = false
  const breakdown = dimensions.map((dimension) => {
    const feature = candidate.features[dimension]
    const weight = RECOMMENDATION_DIMENSION_WEIGHTS[dimension]
    const evidence = dimensionEvidence(
      dna[dimension],
      feature,
      {
        matchedOnly:
          dimension === 'genres',
      },
    )
    const contribution = round(weight * evidence.match)
    affinity += contribution
    if (feature.available) coveredWeight += weight
    evidenceWeight += weight * evidence.coverage
    hasPersonalizationEvidence ||= evidence.hasEvidence
    return Object.freeze({
      dimension, weight, match: evidence.match, contribution,
      metadataAvailable: feature.available, profileEvidenceCoverage: evidence.coverage,
    })
  })
  const taste = tasteEvidence(
    dna.tasteTags,
    candidate.tasteTags,
  )

  const tasteAdjustment = round(
    RECOMMENDATION_TASTE_MAX_ADJUSTMENT
      * taste.match,
  )

  hasPersonalizationEvidence ||=
    taste.hasEvidence

  const qualityAdjustment = (
    recommendationQualityAdjustment(candidate)
  )

  const score = round(
    Math.min(
      RECOMMENDATION_SCORE_MAX,
      Math.max(
        RECOMMENDATION_SCORE_MIN,
        RECOMMENDATION_NEUTRAL_SCORE
          + 50 * affinity
          + qualityAdjustment
          + tasteAdjustment,
      ),
    ),
    2,
  )
  return Object.freeze({
    mediaKey: candidate.mediaKey, tmdbId: candidate.tmdbId, mediaType: candidate.mediaType,
    title: candidate.title, score, metadataCoverage: round(coveredWeight),
    profileEvidenceCoverage: round(evidenceWeight), hasPersonalizationEvidence,
    tasteMatch: taste.match,
    tasteAdjustment,
    tasteEvidenceCount: taste.matchedCount,
    breakdown: Object.freeze(breakdown), reasons: Object.freeze(explanationReasons(breakdown)),
    popularity: candidate.popularity,
  })
}

function excludedKeys(values) {
  if (values === undefined) return []
  if (!Array.isArray(values)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
  return values.map((value) => {
    if (typeof value === 'string' && /^(movie|tv)_[1-9]\d*$/.test(value)) return value
    const key = recommendationMediaKey(value?.mediaType, value?.tmdbId)
    if (!key) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
    return key
  })
}

export function excludeKnownMedia(candidates, { rated = [], hidden = [] } = {}) {
  if (!Array.isArray(candidates)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
  const excluded = new Set([...excludedKeys(rated), ...excludedKeys(hidden)])
  return candidates.filter((candidate) => {
    const key = recommendationMediaKey(candidate?.mediaType, candidate?.tmdbId)
    return key !== null && !excluded.has(key)
  })
}

const RECOMMENDATION_HEAD_SIZE = 20
const RECOMMENDATION_FAMILIAR_HEAD_QUOTA = 12

function recognizableCandidate(candidate) {
  if (!candidate) return false

  const voteThreshold = (
    candidate.mediaType === 'movie'
      ? 3000
      : 1000
  )

  return (
    candidate.voteCount >= voteThreshold
    || familiarityAdjustment(candidate) >= 8.5
  )
}


function usefulGenreFit(result) {
  return (
    genreContribution(result) >= 0.08
    && result.score >= 52
  )
}


function applyFamiliarityQuota(
  rankedResults,
  candidateByMediaKey,
) {
  if (
    rankedResults.length
      <= RECOMMENDATION_HEAD_SIZE
  ) {
    // We still reorder short lists,
    // but never manufacture candidates.
  }

  const familiarResults = (
    rankedResults
      .filter(result => {
        const candidate = (
          candidateByMediaKey.get(
            result.mediaKey,
          )
        )

        return (
          recognizableCandidate(
            candidate,
          )
          && usefulGenreFit(result)
        )
      })
      .sort((a, b) => {
        const aCandidate = (
          candidateByMediaKey.get(
            a.mediaKey,
          )
        )

        const bCandidate = (
          candidateByMediaKey.get(
            b.mediaKey,
          )
        )

        return (
          familiarityAdjustment(
            bCandidate,
          )
          - familiarityAdjustment(
            aCandidate,
          )
          || b.score - a.score
          || (
            genreContribution(b)
            - genreContribution(a)
          )
          || a.mediaKey.localeCompare(
            b.mediaKey,
          )
        )
      })
  )

  const selected = new Set()
  const head = []

  let familiarIndex = 0
  let rankedIndex = 0

  function nextUnselected(list, index) {
    let cursor = index

    while (cursor < list.length) {
      const value = list[cursor]
      cursor += 1

      if (!selected.has(value.mediaKey)) {
        return {
          value,
          nextIndex: cursor,
        }
      }
    }

    return {
      value: null,
      nextIndex: cursor,
    }
  }

  // Alternate familiar / DNA-first.
  // Result: up to 10 recognizable titles
  // in the first 20.
  for (
    let position = 0;
    position < Math.min(
      RECOMMENDATION_HEAD_SIZE,
      rankedResults.length,
    );
    position += 1
  ) {
    const wantFamiliar = (
      position % 2 === 0
      && (
        head.filter(item => (
          recognizableCandidate(
            candidateByMediaKey.get(
              item.mediaKey,
            ),
          )
          && usefulGenreFit(item)
        )).length
        < RECOMMENDATION_FAMILIAR_HEAD_QUOTA
      )
    )

    let picked = null

    if (wantFamiliar) {
      const next = nextUnselected(
        familiarResults,
        familiarIndex,
      )

      familiarIndex = next.nextIndex
      picked = next.value
    }

    if (!picked) {
      const next = nextUnselected(
        rankedResults,
        rankedIndex,
      )

      rankedIndex = next.nextIndex
      picked = next.value
    }

    if (!picked) {
      const next = nextUnselected(
        familiarResults,
        familiarIndex,
      )

      familiarIndex = next.nextIndex
      picked = next.value
    }

    if (!picked) break

    selected.add(picked.mediaKey)
    head.push(picked)
  }

  return [
    ...head,
    ...rankedResults.filter(
      result => (
        !selected.has(
          result.mediaKey,
        )
      ),
    ),
  ]
}


export function rankRecommendations({ dna, candidates, algorithmVersion = RECOMMENDATION_ALGORITHM_VERSION } = {}) {
  if (algorithmVersion !== RECOMMENDATION_ALGORITHM_VERSION) {
    throwRecommendationError(RECOMMENDATION_ERROR_CODES.UNSUPPORTED_VERSION)
  }
  if (!Array.isArray(candidates)) throwRecommendationError(RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
  const dnaIndex = normalizeDna(dna)
  const normalized = candidates.map(normalizeCandidate)
  const counts = new Map()
  for (const candidate of normalized) if (candidate) counts.set(candidate.mediaKey, (counts.get(candidate.mediaKey) ?? 0) + 1)
  const accepted = normalized.filter((candidate) => candidate && counts.get(candidate.mediaKey) === 1)
  const candidateByMediaKey = new Map(
    accepted.map(candidate => [
      candidate.mediaKey,
      candidate,
    ]),
  )

  const rankedResults = accepted
    .map(
      candidate => (
        rankCandidate(
          candidate,
          dnaIndex,
        )
      ),
    )
    .sort((a, b) => {
      const aCandidate = (
        candidateByMediaKey.get(
          a.mediaKey,
        )
      )

      const bCandidate = (
        candidateByMediaKey.get(
          b.mediaKey,
        )
      )

      const aRankingScore = (
        a.score
        + familiarityAdjustment(
          aCandidate,
        )
      )

      const bRankingScore = (
        b.score
        + familiarityAdjustment(
          bCandidate,
        )
      )

      const rankingDifference = (
        bRankingScore
        - aRankingScore
      )

      if (
        Math.abs(
          rankingDifference,
        ) > 1e-9
      ) {
        return rankingDifference
      }

      return (
        b.score - a.score
        || (
          b.profileEvidenceCoverage
          - a.profileEvidenceCoverage
        )
        || (
          b.metadataCoverage
          - a.metadataCoverage
        )
        || (
          b.popularity
          - a.popularity
        )
        || a.mediaKey.localeCompare(
          b.mediaKey,
        )
      )
    })
  const results = applyFamiliarityQuota(
    rankedResults,
    candidateByMediaKey,
  )

  return Object.freeze({
    algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
    results: Object.freeze(results),
    rejectedCount: candidates.length - accepted.length,
  })
}
