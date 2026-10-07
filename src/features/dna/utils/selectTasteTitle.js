export const TASTE_TITLE_THRESHOLDS =
  Object.freeze({
    strength: 0.55,
    confidence: 0.45,
    positiveEvidenceWeight: 1.5,
    evidenceCount: 2,
  })

export const TASTE_COMBINATION_THRESHOLDS =
  Object.freeze({
    strength: 0.6,
    confidence: 0.5,
    positiveEvidenceWeight: 1.5,
    evidenceCount: 2,
  })

export const TASTE_TITLE_IDS =
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

export const TASTE_TITLE_COMBINATIONS =
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
      TASTE_TITLE_IDS,
      entry.key,
    )
    && finite(entry.strength)
    && entry.strength
      >= TASTE_TITLE_THRESHOLDS.strength
    && finite(entry.confidence)
    && entry.confidence
      >= TASTE_TITLE_THRESHOLDS.confidence
    && finite(
      entry.positiveEvidenceWeight,
    )
    && entry.positiveEvidenceWeight
      >= TASTE_TITLE_THRESHOLDS
        .positiveEvidenceWeight
    && Number.isSafeInteger(
      entry.evidenceCount,
    )
    && entry.evidenceCount
      >= TASTE_TITLE_THRESHOLDS
        .evidenceCount
  )
}

function combinationEligible(entry) {
  return (
    eligible(entry)
    && entry.strength
      >= TASTE_COMBINATION_THRESHOLDS
        .strength
    && entry.confidence
      >= TASTE_COMBINATION_THRESHOLDS
        .confidence
    && entry.positiveEvidenceWeight
      >= TASTE_COMBINATION_THRESHOLDS
        .positiveEvidenceWeight
    && entry.evidenceCount
      >= TASTE_COMBINATION_THRESHOLDS
        .evidenceCount
  )
}

function compareTasteEntries(
  left,
  right,
) {
  return (
    right.strength - left.strength
    || right.confidence
      - left.confidence
    || right.positiveEvidenceWeight
      - left.positiveEvidenceWeight
    || right.evidenceCount
      - left.evidenceCount
    || left.key.localeCompare(
      right.key,
    )
  )
}

function makeCombination(
  left,
  right,
  id,
) {
  const ordered = [
    left,
    right,
  ].sort(compareTasteEntries)

  const primary = ordered[0]
  const secondary = ordered[1]

  return {
    id,
    kind: 'combination',

    tasteKey: primary.key,
    primaryTasteKey: primary.key,
    secondaryTasteKey:
      secondary.key,

    tasteKeys: Object.freeze([
      primary.key,
      secondary.key,
    ]),

    strength: Math.min(
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

    positiveEvidenceWeight:
      Math.min(
        left.positiveEvidenceWeight,
        right.positiveEvidenceWeight,
      ),

    evidenceCount:
      Math.min(
        left.evidenceCount,
        right.evidenceCount,
      ),
  }
}

function compareCombinations(
  left,
  right,
) {
  return (
    right.strength - left.strength
    || right.averageStrength
      - left.averageStrength
    || right.confidence
      - left.confidence
    || right.positiveEvidenceWeight
      - left.positiveEvidenceWeight
    || right.evidenceCount
      - left.evidenceCount
    || left.id.localeCompare(
      right.id,
    )
  )
}

function findBestCombination(
  candidates,
) {
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
        TASTE_TITLE_COMBINATIONS[
          pairKey(
            left.key,
            right.key,
          )
        ]

      if (!id) continue

      combinations.push(
        makeCombination(
          left,
          right,
          id,
        ),
      )
    }
  }

  combinations.sort(
    compareCombinations,
  )

  return combinations[0] ?? null
}

function makeSingle(entry) {
  return Object.freeze({
    id: TASTE_TITLE_IDS[
      entry.key
    ],

    kind: 'single',

    tasteKey: entry.key,
    primaryTasteKey: entry.key,
    secondaryTasteKey: null,

    tasteKeys: Object.freeze([
      entry.key,
    ]),

    strength: entry.strength,
    confidence: entry.confidence,

    evidenceCount:
      entry.evidenceCount,

    positiveEvidenceWeight:
      entry.positiveEvidenceWeight,
  })
}

export function selectTasteTitle(
  dimensions,
) {
  const tasteTags =
    dimensions?.tasteTags

  if (!Array.isArray(tasteTags)) {
    return null
  }

  const candidates =
    tasteTags
      .filter(eligible)
      .sort(compareTasteEntries)

  if (!candidates.length) {
    return null
  }

  const combination =
    findBestCombination(candidates)

  if (combination) {
    return Object.freeze(
      combination,
    )
  }

  return makeSingle(
    candidates[0],
  )
}
