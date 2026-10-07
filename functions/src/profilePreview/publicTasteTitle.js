export const PUBLIC_TASTE_TITLE_THRESHOLDS =
  Object.freeze({
    strength: 0.55,
    confidence: 0.45,
    positiveEvidenceWeight: 1.5,
    evidenceCount: 2,
  })

export const PUBLIC_TASTE_COMBINATION_THRESHOLDS =
  Object.freeze({
    strength: 0.6,
    confidence: 0.5,
    positiveEvidenceWeight: 1.5,
    evidenceCount: 2,
  })

export const PUBLIC_TASTE_TITLE_IDS =
  Object.freeze({
    'taste:psychological-thriller':
      'psychologicalThriller',
    'taste:crime-thriller':
      'crimeThriller',
    'taste:emotional-drama':
      'emotionalDrama',
    'taste:philosophical-sci-fi':
      'philosophicalSciFi',
    'taste:dystopian-sci-fi':
      'dystopianSciFi',
    'taste:space-sci-fi':
      'spaceSciFi',
    'taste:coming-of-age':
      'comingOfAge',
    'taste:dark-comedy':
      'darkComedy',
    'taste:slasher':
      'slasher',
    'taste:supernatural-horror':
      'supernaturalHorror',
    'taste:russian-romantic-tv':
      'russianRomanticTv',
  })

function pairKey(left, right) {
  return [left, right]
    .sort()
    .join('|')
}

export const PUBLIC_TASTE_TITLE_COMBINATIONS =
  Object.freeze({
    [pairKey(
      'taste:psychological-thriller',
      'taste:crime-thriller',
    )]: 'criminalProfiler',

    [pairKey(
      'taste:psychological-thriller',
      'taste:emotional-drama',
    )]: 'emotionalMaze',

    [pairKey(
      'taste:psychological-thriller',
      'taste:philosophical-sci-fi',
    )]: 'mindArchitect',

    [pairKey(
      'taste:psychological-thriller',
      'taste:dystopian-sci-fi',
    )]: 'paranoidVisionary',

    [pairKey(
      'taste:psychological-thriller',
      'taste:space-sci-fi',
    )]: 'cosmicMind',

    [pairKey(
      'taste:psychological-thriller',
      'taste:dark-comedy',
    )]: 'darkMind',

    [pairKey(
      'taste:psychological-thriller',
      'taste:supernatural-horror',
    )]: 'nightmareHunter',

    [pairKey(
      'taste:psychological-thriller',
      'taste:slasher',
    )]: 'fearAnalyst',

    [pairKey(
      'taste:crime-thriller',
      'taste:emotional-drama',
    )]: 'woundedDetective',

    [pairKey(
      'taste:crime-thriller',
      'taste:dark-comedy',
    )]: 'blackDetective',

    [pairKey(
      'taste:crime-thriller',
      'taste:supernatural-horror',
    )]: 'occultDetective',

    [pairKey(
      'taste:emotional-drama',
      'taste:philosophical-sci-fi',
    )]: 'sentimentalPhilosopher',

    [pairKey(
      'taste:emotional-drama',
      'taste:space-sci-fi',
    )]: 'cosmicRomantic',

    [pairKey(
      'taste:emotional-drama',
      'taste:coming-of-age',
    )]: 'nostalgist',

    [pairKey(
      'taste:emotional-drama',
      'taste:dark-comedy',
    )]: 'laughsThroughTears',

    [pairKey(
      'taste:emotional-drama',
      'taste:supernatural-horror',
    )]: 'hauntedHeart',

    [pairKey(
      'taste:emotional-drama',
      'taste:russian-romantic-tv',
    )]: 'hopelessRomantic',

    [pairKey(
      'taste:philosophical-sci-fi',
      'taste:dystopian-sci-fi',
    )]: 'dystopianThinker',

    [pairKey(
      'taste:philosophical-sci-fi',
      'taste:space-sci-fi',
    )]: 'cosmicPhilosopher',

    [pairKey(
      'taste:philosophical-sci-fi',
      'taste:coming-of-age',
    )]: 'youngPhilosopher',

    [pairKey(
      'taste:philosophical-sci-fi',
      'taste:dark-comedy',
    )]: 'absurdist',

    [pairKey(
      'taste:philosophical-sci-fi',
      'taste:supernatural-horror',
    )]: 'metaphysicalDreamer',

    [pairKey(
      'taste:dystopian-sci-fi',
      'taste:space-sci-fi',
    )]: 'lastStarfarer',

    [pairKey(
      'taste:dystopian-sci-fi',
      'taste:dark-comedy',
    )]: 'apocalypseSatirist',

    [pairKey(
      'taste:dystopian-sci-fi',
      'taste:slasher',
    )]: 'apocalypseSurvivor',

    [pairKey(
      'taste:space-sci-fi',
      'taste:coming-of-age',
    )]: 'starryEyedExplorer',

    [pairKey(
      'taste:space-sci-fi',
      'taste:dark-comedy',
    )]: 'cosmicIronist',

    [pairKey(
      'taste:space-sci-fi',
      'taste:supernatural-horror',
    )]: 'cosmicMystic',

    [pairKey(
      'taste:coming-of-age',
      'taste:dark-comedy',
    )]: 'ironicTeen',

    [pairKey(
      'taste:coming-of-age',
      'taste:supernatural-horror',
    )]: 'hauntedYouth',

    [pairKey(
      'taste:coming-of-age',
      'taste:russian-romantic-tv',
    )]: 'youngRomantic',

    [pairKey(
      'taste:dark-comedy',
      'taste:slasher',
    )]: 'bloodyJoker',

    [pairKey(
      'taste:dark-comedy',
      'taste:supernatural-horror',
    )]: 'gothicIronist',

    [pairKey(
      'taste:slasher',
      'taste:supernatural-horror',
    )]: 'horrorRoyalty',

    [pairKey(
      'taste:supernatural-horror',
      'taste:russian-romantic-tv',
    )]: 'gothicRomantic',
  })

function finite(value) {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
  )
}

function eligible(entry) {
  return (
    entry
    && typeof entry === 'object'
    && typeof entry.key === 'string'
    && Object.hasOwn(
      PUBLIC_TASTE_TITLE_IDS,
      entry.key,
    )
    && finite(entry.strength)
    && entry.strength
      >= PUBLIC_TASTE_TITLE_THRESHOLDS
        .strength
    && finite(entry.confidence)
    && entry.confidence
      >= PUBLIC_TASTE_TITLE_THRESHOLDS
        .confidence
    && finite(
      entry.positiveEvidenceWeight,
    )
    && entry.positiveEvidenceWeight
      >= PUBLIC_TASTE_TITLE_THRESHOLDS
        .positiveEvidenceWeight
    && Number.isSafeInteger(
      entry.evidenceCount,
    )
    && entry.evidenceCount
      >= PUBLIC_TASTE_TITLE_THRESHOLDS
        .evidenceCount
  )
}

function combinationEligible(entry) {
  return (
    eligible(entry)
    && entry.strength
      >= PUBLIC_TASTE_COMBINATION_THRESHOLDS
        .strength
    && entry.confidence
      >= PUBLIC_TASTE_COMBINATION_THRESHOLDS
        .confidence
    && entry.positiveEvidenceWeight
      >= PUBLIC_TASTE_COMBINATION_THRESHOLDS
        .positiveEvidenceWeight
    && entry.evidenceCount
      >= PUBLIC_TASTE_COMBINATION_THRESHOLDS
        .evidenceCount
  )
}

function compareEntries(left, right) {
  return (
    right.strength - left.strength
    || right.confidence - left.confidence
    || right.positiveEvidenceWeight
      - left.positiveEvidenceWeight
    || right.evidenceCount
      - left.evidenceCount
    || left.key.localeCompare(right.key)
  )
}

function findCombination(candidates) {
  const top = candidates
    .filter(combinationEligible)
    .slice(0, 4)

  const combinations = []

  for (
    let leftIndex = 0;
    leftIndex < top.length;
    leftIndex += 1
  ) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < top.length;
      rightIndex += 1
    ) {
      const left = top[leftIndex]
      const right = top[rightIndex]

      const id =
        PUBLIC_TASTE_TITLE_COMBINATIONS[
          pairKey(left.key, right.key)
        ]

      if (!id) continue

      combinations.push({
        id,
        weakestStrength: Math.min(
          left.strength,
          right.strength,
        ),
        averageStrength:
          (
            left.strength
            + right.strength
          ) / 2,
        confidence: Math.min(
          left.confidence,
          right.confidence,
        ),
      })
    }
  }

  combinations.sort(
    (left, right) => (
      right.weakestStrength
        - left.weakestStrength
      || right.averageStrength
        - left.averageStrength
      || right.confidence
        - left.confidence
      || left.id.localeCompare(right.id)
    ),
  )

  return combinations[0]?.id ?? null
}

export function selectPublicTasteTitle(
  dimensions,
) {
  const source = dimensions?.tasteTags

  if (!Array.isArray(source)) {
    return null
  }

  const candidates = source
    .filter(eligible)
    .sort(compareEntries)

  if (!candidates.length) {
    return null
  }

  return (
    findCombination(candidates)
    ?? PUBLIC_TASTE_TITLE_IDS[
      candidates[0].key
    ]
    ?? null
  )
}
