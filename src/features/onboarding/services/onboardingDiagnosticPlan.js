import {
  getOnboardingMediaKey,
} from '../validation/onboardingValidation.js'

export const ONBOARDING_DIAGNOSTIC_ROLE_TARGETS =
  Object.freeze({
    anchor: 14,
    discriminator: 10,
    probe: 6,
  })

const MOVIE_ROLE_SEQUENCE = Object.freeze([
  'anchor',
  'discriminator',
  'anchor',
  'probe',
  'discriminator',
  'anchor',
  'discriminator',
  'anchor',
  'probe',
  'discriminator',
  'anchor',
  'discriminator',
  'probe',
  'anchor',
  'anchor',
])

const TV_ROLE_SEQUENCE = Object.freeze([
  'anchor',
  'probe',
  'discriminator',
  'anchor',
  'anchor',
  'discriminator',
  'probe',
  'anchor',
  'discriminator',
  'anchor',
  'discriminator',
  'probe',
  'anchor',
  'discriminator',
  'anchor',
])

export const ONBOARDING_DIAGNOSTIC_SLOT_PLAN =
  Object.freeze(
    MOVIE_ROLE_SEQUENCE.flatMap(
      (role, index) => [
        Object.freeze({
          mediaType: 'movie',
          role,
        }),
        Object.freeze({
          mediaType: 'tv',
          role: TV_ROLE_SEQUENCE[index],
        }),
      ],
    ),
  )

function profile(
  role,
  tasteTargets = [],
  {
    franchiseGroup = null,
    priority = 0,
  } = {},
) {
  return Object.freeze({
    role,
    tasteTargets: Object.freeze([
      ...tasteTargets,
    ]),
    franchiseGroup,
    priority,
  })
}

const PROFILES = Object.freeze({
  // -------------------------
  // Anchors with useful taste evidence
  // -------------------------

  movie_597: profile(
    'anchor',
    ['taste:emotional-drama'],
  ),

  // -------------------------
  // Movie discriminators
  // -------------------------

  movie_603: profile(
    'discriminator',
    ['taste:philosophical-sci-fi'],
    {
      franchiseGroup: 'matrix',
    },
  ),

  movie_680: profile(
    'discriminator',
    ['taste:dark-comedy'],
  ),

  movie_496243: profile(
    'discriminator',
    ['taste:dark-comedy'],
  ),

  movie_27205: profile(
    'discriminator',
    [
      'taste:psychological-thriller',
      'taste:philosophical-sci-fi',
    ],
  ),

  movie_550: profile(
    'discriminator',
    ['taste:psychological-thriller'],
  ),

  movie_101: profile(
    'discriminator',
    ['taste:crime-thriller'],
  ),

  movie_218: profile(
    'discriminator',
    ['taste:dystopian-sci-fi'],
    {
      franchiseGroup: 'terminator',
    },
  ),

  movie_76341: profile(
    'discriminator',
    ['taste:dystopian-sci-fi'],
  ),

  movie_438631: profile(
    'discriminator',
    ['taste:space-sci-fi'],
    {
      franchiseGroup: 'dune',
    },
  ),

  movie_545611: profile(
    'discriminator',
    ['taste:philosophical-sci-fi'],
  ),

  // Coming-of-age discriminator.
  movie_84892: profile(
    'discriminator',
    ['taste:coming-of-age'],
    {
      priority: 30,
    },
  ),

  // -------------------------
  // Movie probes
  // -------------------------

  movie_419430: profile(
    'probe',
    [
      'taste:psychological-thriller',
      'taste:supernatural-horror',
    ],
    {
      priority: 5,
    },
  ),

  movie_497: profile(
    'probe',
    ['taste:emotional-drama'],
  ),

  movie_348: profile(
    'probe',
    ['taste:space-sci-fi'],
    {
      franchiseGroup: 'alien',
    },
  ),

  movie_120467: profile(
    'probe',
    ['taste:dark-comedy'],
  ),

  movie_13: profile(
    'probe',
    ['taste:emotional-drama'],
  ),

  // Strong slasher probe.
  movie_4232: profile(
    'probe',
    ['taste:slasher'],
    {
      priority: 30,
    },
  ),

  // -------------------------
  // TV discriminators
  // -------------------------

  tv_42009: profile(
    'discriminator',
    [
      'taste:philosophical-sci-fi',
      'taste:dystopian-sci-fi',
    ],
  ),

  tv_70523: profile(
    'discriminator',
    ['taste:philosophical-sci-fi'],
  ),

  tv_46648: profile(
    'discriminator',
    ['taste:psychological-thriller'],
  ),

  tv_82856: profile(
    'discriminator',
    ['taste:space-sci-fi'],
  ),

  tv_93405: profile(
    'discriminator',
    ['taste:dystopian-sci-fi'],
  ),

  tv_60574: profile(
    'discriminator',
    ['taste:crime-thriller'],
  ),

  tv_1405: profile(
    'discriminator',
    ['taste:psychological-thriller'],
  ),

  tv_19885: profile(
    'discriminator',
    ['taste:crime-thriller'],
  ),

  // -------------------------
  // TV probes
  // -------------------------

  tv_66732: profile(
    'probe',
    ['taste:supernatural-horror'],
  ),

  tv_119051: profile(
    'probe',
    [
      'taste:supernatural-horror',
      'taste:dark-comedy',
    ],
    {
      priority: 5,
    },
  ),

  tv_100088: profile(
    'probe',
    ['taste:supernatural-horror'],
  ),

  tv_1402: profile(
    'probe',
    ['taste:supernatural-horror'],
  ),

  tv_76479: profile(
    'probe',
    ['taste:dark-comedy'],
  ),

  // -------------------------
  // Franchise-only annotations
  // -------------------------

  movie_120: profile(
    'anchor',
    [],
    {
      franchiseGroup: 'lotr',
    },
  ),

  movie_155: profile(
    'anchor',
    [],
    {
      franchiseGroup: 'batman',
    },
  ),

  movie_329: profile(
    'anchor',
    [],
    {
      franchiseGroup: 'jurassic',
    },
  ),

  movie_862: profile(
    'anchor',
    [],
    {
      franchiseGroup: 'toy-story',
    },
  ),

  movie_324857: profile(
    'anchor',
    [],
    {
      franchiseGroup: 'spider-man',
    },
  ),

  tv_1396: profile(
    'anchor',
    [],
    {
      franchiseGroup: 'breaking-bad',
    },
  ),

  tv_60059: profile(
    'anchor',
    [],
    {
      franchiseGroup: 'breaking-bad',
    },
  ),

  tv_1399: profile(
    'anchor',
    [],
    {
      franchiseGroup: 'game-of-thrones',
    },
  ),

  tv_94997: profile(
    'anchor',
    [],
    {
      franchiseGroup: 'game-of-thrones',
    },
  ),
})

const DEFAULT_PROFILE = profile(
  'anchor',
)

export function getOnboardingDiagnosticProfile(
  seed,
) {
  const key = getOnboardingMediaKey(
    seed?.mediaType,
    seed?.tmdbId ?? seed?.id,
  )

  return key
    ? PROFILES[key] ?? DEFAULT_PROFILE
    : DEFAULT_PROFILE
}

function candidateScore(
  candidate,
  tasteCounts,
) {
  const profileValue = candidate.profile

  const novelty = (
    profileValue.tasteTargets.reduce(
      (sum, taste) => (
        sum
        + (
          1
          / (
            1
            + (
              tasteCounts.get(taste)
              ?? 0
            )
          )
        )
      ),
      0,
    )
  )

  return (
    novelty * 100
    + profileValue.priority
    - candidate.index / 100000
  )
}

function franchiseAvailable(
  candidate,
  seenFranchises,
) {
  const franchise =
    candidate.profile.franchiseGroup

  return (
    !franchise
    || !seenFranchises.has(franchise)
  )
}

function bestCandidate(
  values,
  tasteCounts,
) {
  let best = null
  let bestScore = -Infinity

  for (const candidate of values) {
    const score = candidateScore(
      candidate,
      tasteCounts,
    )

    if (
      score > bestScore
      || (
        score === bestScore
        && (
          !best
          || candidate.index < best.index
        )
      )
    ) {
      best = candidate
      bestScore = score
    }
  }

  return best
}

function chooseForSlot(
  remaining,
  slot,
  seenFranchises,
  tasteCounts,
) {
  const groups = [
    candidate => (
      candidate.seed.mediaType === slot.mediaType
      && candidate.profile.role === slot.role
      && franchiseAvailable(
        candidate,
        seenFranchises,
      )
    ),

    candidate => (
      candidate.seed.mediaType === slot.mediaType
      && franchiseAvailable(
        candidate,
        seenFranchises,
      )
    ),

    candidate => (
      candidate.profile.role === slot.role
      && franchiseAvailable(
        candidate,
        seenFranchises,
      )
    ),

    candidate => franchiseAvailable(
      candidate,
      seenFranchises,
    ),

    candidate => (
      candidate.seed.mediaType === slot.mediaType
      && candidate.profile.role === slot.role
    ),

    candidate => (
      candidate.seed.mediaType === slot.mediaType
    ),

    () => true,
  ]

  for (const predicate of groups) {
    const candidates =
      remaining.filter(predicate)

    if (candidates.length) {
      return bestCandidate(
        candidates,
        tasteCounts,
      )
    }
  }

  return null
}

export function orderDiagnosticOnboardingSeeds(
  seeds,
) {
  if (!Array.isArray(seeds)) return []

  const unique = new Map()

  seeds.forEach((seed, index) => {
    const key = getOnboardingMediaKey(
      seed?.mediaType,
      seed?.tmdbId,
    )

    if (!key || unique.has(key)) return

    unique.set(
      key,
      {
        seed,
        index,
        profile:
          getOnboardingDiagnosticProfile(seed),
      },
    )
  })

  const remaining = [
    ...unique.values(),
  ]

  const ordered = []
  const seenFranchises = new Set()
  const tasteCounts = new Map()

  function takeCandidate(
    selected,
  ) {
    ordered.push(selected.seed)

    for (
      const taste
      of selected.profile.tasteTargets
    ) {
      tasteCounts.set(
        taste,
        (
          tasteCounts.get(taste)
          ?? 0
        ) + 1,
      )
    }

    if (
      selected.profile.franchiseGroup
    ) {
      seenFranchises.add(
        selected.profile.franchiseGroup,
      )
    }

    const index =
      remaining.indexOf(selected)

    if (index >= 0) {
      remaining.splice(index, 1)
    }
  }

  // The first 30 cards are the diagnostic contract.
  //
  // Do not fall back to another role here:
  // otherwise an anchor can consume a discriminator
  // or probe slot and silently destroy the intended
  // 14 / 10 / 6 balance.
  for (
    const slot
    of ONBOARDING_DIAGNOSTIC_SLOT_PLAN
  ) {
    const exact = remaining.filter(
      candidate => (
        candidate.seed.mediaType
          === slot.mediaType
        && candidate.profile.role
          === slot.role
        && franchiseAvailable(
          candidate,
          seenFranchises,
        )
      ),
    )

    const selected = bestCandidate(
      exact,
      tasteCounts,
    )

    if (!selected) {
      continue
    }

    takeCandidate(selected)
  }

  // Everything after the diagnostic base is reserve
  // capacity. The catalogue loader may need it when
  // TMDB reports an individual curated title missing.
  //
  // From this point a relaxed fallback is desirable:
  // filling the deck is more important than preserving
  // the base 30-card quota.
  let overflowSlot = 0

  while (remaining.length) {
    const slot =
      ONBOARDING_DIAGNOSTIC_SLOT_PLAN[
        overflowSlot
        % ONBOARDING_DIAGNOSTIC_SLOT_PLAN.length
      ]

    const selected = chooseForSlot(
      remaining,
      slot,
      seenFranchises,
      tasteCounts,
    )

    if (!selected) break

    takeCandidate(selected)
    overflowSlot += 1
  }

  return ordered
}

