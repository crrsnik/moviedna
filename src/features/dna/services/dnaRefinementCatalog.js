import {
  TMDB_DEFAULT_LANGUAGE,
} from '../../../shared/config/tmdb.js'

import {
  getTmdb,
} from '../../catalog/services/tmdbClient.js'

import {
  getOnboardingMediaSummary,
  normalizeOnboardingMediaSummary,
} from '../../onboarding/services/onboardingCatalogService.js'

import {
  getOnboardingMediaKey,
} from '../../onboarding/validation/onboardingValidation.js'

import {
  DNA_REFINEMENT_BENCHMARK_SEEDS,
  getBenchmarkFranchiseByKey,
} from '../constants/dnaRefinementBenchmark.js'


const FALLBACK_SOURCE_PAGES = 3
const BENCHMARK_CONCURRENCY = 6

const FALLBACK_SOURCES = Object.freeze([
  ['movie', '/movie/popular'],
  ['movie', '/movie/top_rated'],
  ['tv', '/tv/popular'],
  ['tv', '/tv/top_rated'],
])


const BROAD_GENRES = Object.freeze({
  actionAdventure: {
    movie: [28, 12],
    tv: [10759],
  },

  comedy: {
    movie: [35],
    tv: [35],
  },

  drama: {
    movie: [18],
    tv: [18],
  },

  crimeThriller: {
    movie: [80, 53, 9648],
    tv: [80, 9648],
  },

  sciFiFantasy: {
    movie: [878, 14],
    tv: [10765],
  },

  horrorMystery: {
    movie: [27, 9648],
    tv: [9648, 10765],
  },

  animationFamily: {
    movie: [16, 10751],
    tv: [16, 10751, 10762],
  },

  romance: {
    movie: [10749],
    tv: [18, 35],
  },
})


const ERA_RATIOS = Object.freeze({
  classic: 0.20,
  twoThousands: 0.25,
  twentyTens: 0.35,
  recentEstablished: 0.20,
})


const FRANCHISE_PATTERNS = Object.freeze([
  ['avengers', /\bavengers\b/i],

  [
    'spider-man',
    /\bspider[- ]?man\b|\bspider[- ]?verse\b/i,
  ],

  [
    'lotr',
    /\blord of the rings\b|\bhobbit\b/i,
  ],

  [
    'harry-potter',
    /\bharry potter\b|\bfantastic beasts\b/i,
  ],

  ['star-wars', /\bstar wars\b/i],

  [
    'batman',
    /\bbatman\b|\bdark knight\b/i,
  ],

  [
    'jurassic',
    /\bjurassic (?:park|world)\b/i,
  ],

  ['matrix', /\bmatrix\b/i],
  ['alien', /\balien(?:s)?\b/i],
  ['terminator', /\bterminator\b/i],
  ['toy-story', /\btoy story\b/i],

  [
    'pirates-caribbean',
    /\bpirates of the caribbean\b/i,
  ],

  ['dune', /\bdune\b/i],

  [
    'mission-impossible',
    /\bmission:?\s*impossible\b/i,
  ],

  [
    'fast-furious',
    /\bfast (?:&|and) furious\b|\bfast and the furious\b/i,
  ],

  ['john-wick', /\bjohn wick\b/i],

  [
    'hunger-games',
    /\bhunger games\b/i,
  ],

  [
    'planet-apes',
    /\bplanet of the apes\b/i,
  ],

  [
    'back-to-future',
    /\bback to the future\b/i,
  ],

  ['shrek', /\bshrek\b/i],

  [
    'kung-fu-panda',
    /\bkung fu panda\b/i,
  ],

  [
    'despicable-me',
    /\bdespicable me\b|\bminions\b/i,
  ],

  [
    'breaking-bad',
    /\bbreaking bad\b|\bbetter call saul\b/i,
  ],

  [
    'game-of-thrones',
    /\bgame of thrones\b|\bhouse of the dragon\b/i,
  ],
])


function mediaKey(media) {
  return getOnboardingMediaKey(
    media?.mediaType,
    media?.id ?? media?.tmdbId,
  )
}


export function getRefinementFranchise(
  media,
) {
  if (
    typeof media?.franchiseGroup === 'string'
    && media.franchiseGroup
  ) {
    return media.franchiseGroup
  }

  const title = typeof media?.title === 'string'
    ? media.title.trim()
    : ''

  if (!title) return null

  for (const [
    franchise,
    pattern,
  ] of FRANCHISE_PATTERNS) {
    if (pattern.test(title)) {
      return franchise
    }
  }

  return null
}


function releaseYear(media) {
  if (
    typeof media?.releaseDate !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(
      media.releaseDate,
    )
  ) {
    return null
  }

  return Number(
    media.releaseDate.slice(0, 4),
  )
}


function eraFor(media) {
  const year = releaseYear(media)

  if (!year) return 'unknown'
  if (year < 2000) return 'classic'
  if (year < 2010) return 'twoThousands'
  if (year < 2020) return 'twentyTens'

  return 'recentEstablished'
}


export function getRefinementCategories(media) {
  const genreIds = new Set(
    Array.isArray(media?.genreIds)
      ? media.genreIds
      : [],
  )

  return Object.entries(BROAD_GENRES)
    .filter(([, ids]) => (
      (ids[media?.mediaType] ?? [])
        .some(id => genreIds.has(id))
    ))
    .map(([name]) => name)
}


function isEstablished(
  media,
  currentYear,
) {
  const year = releaseYear(media)

  // Do not use this year or last year's releases.
  if (
    !Number.isSafeInteger(year)
    || year > currentYear - 2
  ) {
    return false
  }

  if (
    typeof media.voteAverage !== 'number'
    || media.voteAverage < 6
  ) {
    return false
  }

  const minimumVotes = media.mediaType === 'movie'
    ? 2500
    : 1000

  return (
    Number.isSafeInteger(media.voteCount)
    && media.voteCount >= minimumVotes
  )
}


function familiarityScore(media) {
  const votes = Math.log10(
    Math.max(
      1,
      media.voteCount,
    ),
  )

  const rating = (
    typeof media.voteAverage === 'number'
  )
    ? media.voteAverage
    : 0

  const popularity = (
    typeof media.popularity === 'number'
    && Number.isFinite(media.popularity)
  )
    ? media.popularity
    : 0

  return (
    votes * 12
    + rating
    + Math.min(
        popularity,
        250,
      ) * 0.015
  )
}


function eraTargets(limit) {
  const targets = {}
  let assigned = 0

  const entries = Object.entries(
    ERA_RATIOS,
  )

  entries.forEach(
    ([era, ratio], index) => {
      if (
        index
        === entries.length - 1
      ) {
        targets[era] = limit - assigned
        return
      }

      const count = Math.round(
        limit * ratio,
      )

      targets[era] = count
      assigned += count
    },
  )

  return targets
}


function scoreCandidate(
  media,
  {
    categoryCounts,
    eraCounts,
    eraTarget,
  },
) {
  const categories = (
    getRefinementCategories(media)
  )

  const categoryNeed = categories.length
    ? Math.max(
        ...categories.map(
          category => (
            1 / (
              1
              + (
                categoryCounts[category]
                ?? 0
              )
            )
          ),
        ),
      )
    : 0

  const era = eraFor(media)

  const eraCount = (
    eraCounts[era]
    ?? 0
  )

  const desiredEraCount = (
    eraTarget[era]
    ?? 0
  )

  const eraNeed = (
    desiredEraCount > eraCount
  )
    ? desiredEraCount - eraCount
    : -(
        eraCount - desiredEraCount
      ) * 1.5

  return (
    familiarityScore(media)
    + categoryNeed * 18
    + eraNeed * 2.5
  )
}


export function selectBalancedRefinementMedia(
  candidates,
  limit,
  {
    currentYear = new Date().getFullYear(),
    blockedFranchises = [],
  } = {},
) {
  if (
    !Array.isArray(candidates)
    || !Number.isSafeInteger(limit)
    || limit < 1
  ) {
    return []
  }

  const deduped = new Map()

  for (const media of candidates) {
    const key = mediaKey(media)

    if (
      !key
      || !isEstablished(
        media,
        currentYear,
      )
    ) {
      continue
    }

    const previous = deduped.get(key)

    if (
      !previous
      || familiarityScore(media)
        > familiarityScore(previous)
    ) {
      deduped.set(
        key,
        media,
      )
    }
  }

  const remaining = [
    ...deduped.values(),
  ]

  const selected = []

  const seenFranchises = new Set(
    blockedFranchises,
  )

  const mediaTarget = {
    movie: Math.ceil(limit / 2),
    tv: Math.floor(limit / 2),
  }

  const mediaCounts = {
    movie: 0,
    tv: 0,
  }

  const categoryCounts = (
    Object.fromEntries(
      Object.keys(BROAD_GENRES)
        .map(category => [
          category,
          0,
        ]),
    )
  )

  const eraCounts = {
    classic: 0,
    twoThousands: 0,
    twentyTens: 0,
    recentEstablished: 0,
  }

  const eraTarget = eraTargets(limit)

  while (
    selected.length < limit
    && remaining.length > 0
  ) {
    const eligible = remaining.filter(
      media => {
        const franchise = (
          getRefinementFranchise(media)
        )

        return (
          !franchise
          || !seenFranchises.has(
            franchise,
          )
        )
      },
    )

    if (!eligible.length) break

    const underfilledTypes = [
      'movie',
      'tv',
    ].filter(type => (
      mediaCounts[type]
        < mediaTarget[type]
      && eligible.some(
        media => (
          media.mediaType === type
        ),
      )
    ))

    const allowed = (
      underfilledTypes.length
    )
      ? eligible.filter(
          media => (
            underfilledTypes.includes(
              media.mediaType,
            )
          ),
        )
      : eligible

    let best = null
    let bestScore = -Infinity

    for (const media of allowed) {
      const score = scoreCandidate(
        media,
        {
          categoryCounts,
          eraCounts,
          eraTarget,
        },
      )

      if (
        score > bestScore
        || (
          score === bestScore
          && (
            !best
            || media.id < best.id
          )
        )
      ) {
        best = media
        bestScore = score
      }
    }

    if (!best) break

    selected.push(best)

    mediaCounts[
      best.mediaType
    ] += 1

    const era = eraFor(best)

    if (
      Object.hasOwn(
        eraCounts,
        era,
      )
    ) {
      eraCounts[era] += 1
    }

    for (
      const category
      of getRefinementCategories(best)
    ) {
      categoryCounts[
        category
      ] += 1
    }

    const franchise = (
      getRefinementFranchise(best)
    )

    if (franchise) {
      seenFranchises.add(
        franchise,
      )
    }

    const index = remaining.findIndex(
      media => (
        mediaKey(media)
        === mediaKey(best)
      ),
    )

    remaining.splice(
      index,
      1,
    )
  }

  return selected
}


async function resolveBenchmarkSeeds({
  seeds,
  language,
  signal,
}) {
  const result = []
  let cursor = 0

  async function worker() {
    while (cursor < seeds.length) {
      const index = cursor
      cursor += 1

      const seed = seeds[index]

      try {
        const media = (
          await getOnboardingMediaSummary({
            mediaType: seed.mediaType,
            tmdbId: seed.tmdbId,
            language,
            signal,
          })
        )

        result.push({
          ...media,
          franchiseGroup:
            seed.franchiseGroup
            ?? null,
        })
      } catch (error) {
        if (
          signal?.aborted
          || error?.name === 'AbortError'
        ) {
          throw error
        }

        // A missing benchmark title must not break refinement.
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          BENCHMARK_CONCURRENCY,
          seeds.length,
        ),
      },
      () => worker(),
    ),
  )

  return result
}


function normalizeListResults(
  data,
  mediaType,
) {
  if (
    !Array.isArray(data?.results)
  ) {
    return []
  }

  const result = []

  for (const raw of data.results) {
    try {
      result.push(
        normalizeOnboardingMediaSummary(
          raw,
          mediaType,
        ),
      )
    } catch {
      // Ignore malformed individual TMDb records.
    }
  }

  return result
}


async function loadFallbackPool({
  language,
  signal,
}) {
  const requests = []

  for (const [
    mediaType,
    path,
  ] of FALLBACK_SOURCES) {
    for (
      let page = 1;
      page <= FALLBACK_SOURCE_PAGES;
      page += 1
    ) {
      requests.push(
        getTmdb(
          path,
          {
            language,
            signal,
            browse: {
              page: String(page),
            },
          },
        ).then(data => (
          normalizeListResults(
            data,
            mediaType,
          )
        )),
      )
    }
  }

  return (
    await Promise.all(requests)
  ).flat()
}


export async function loadDnaRefinementCatalog({
  baseResponses = [],
  refinementResponses = [],
  language = TMDB_DEFAULT_LANGUAGE,
  signal,
  limit,
} = {}) {
  if (
    !Number.isSafeInteger(limit)
    || limit < 1
  ) {
    return []
  }

  const allResponses = [
    ...baseResponses,
    ...refinementResponses,
  ]

  const excludedKeys = new Set(
    allResponses
      .map(response => (
        getOnboardingMediaKey(
          response?.mediaType,
          response?.tmdbId,
        )
      ))
      .filter(Boolean),
  )

  const blockedFranchises = new Set(
    [...excludedKeys]
      .map(
        getBenchmarkFranchiseByKey,
      )
      .filter(Boolean),
  )

  const benchmarkSeeds = (
    DNA_REFINEMENT_BENCHMARK_SEEDS
      .filter(seed => {
        const key = (
          getOnboardingMediaKey(
            seed.mediaType,
            seed.tmdbId,
          )
        )

        if (
          !key
          || excludedKeys.has(key)
        ) {
          return false
        }

        const franchise = (
          seed.franchiseGroup
          ?? null
        )

        return (
          !franchise
          || !blockedFranchises.has(
            franchise,
          )
        )
      })
  )

  const benchmarkCandidates = (
    await resolveBenchmarkSeeds({
      seeds: benchmarkSeeds,
      language,
      signal,
    })
  )

  const selected = (
    selectBalancedRefinementMedia(
      benchmarkCandidates,
      limit,
      {
        blockedFranchises,
      },
    )
  )

  if (selected.length >= limit) {
    return selected
  }

  // Dynamic TMDb lists are now only a safety fallback.
  const selectedKeys = new Set(
    selected
      .map(mediaKey)
      .filter(Boolean),
  )

  const fallbackBlockedFranchises = new Set(
    blockedFranchises,
  )

  for (const media of selected) {
    const franchise = (
      getRefinementFranchise(media)
    )

    if (franchise) {
      fallbackBlockedFranchises.add(
        franchise,
      )
    }
  }

  const fallbackCandidates = (
    await loadFallbackPool({
      language,
      signal,
    })
  ).filter(media => {
    const key = mediaKey(media)

    return (
      key
      && !excludedKeys.has(key)
      && !selectedKeys.has(key)
    )
  })

  const fallback = (
    selectBalancedRefinementMedia(
      fallbackCandidates,
      limit - selected.length,
      {
        blockedFranchises:
          fallbackBlockedFranchises,
      },
    )
  )

  return [
    ...selected,
    ...fallback,
  ]
}
