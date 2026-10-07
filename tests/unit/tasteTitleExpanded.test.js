import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  selectTasteTitle,
} from '../../src/features/dna/utils/selectTasteTitle.js'

const expandedTitles = [
  [
    'taste:romantic-drama',
    'romanticDrama',
  ],
  [
    'taste:romantic-comedy',
    'romanticComedy',
  ],
  [
    'taste:mystery-detective',
    'mysteryDetective',
  ],
  [
    'taste:action-spectacle',
    'actionSpectacle',
  ],
  [
    'taste:fantasy-adventure',
    'fantasyAdventure',
  ],
  [
    'taste:dark-fantasy',
    'darkFantasy',
  ],
  [
    'taste:historical-period',
    'historicalPeriod',
  ],
  [
    'taste:war-drama',
    'warDrama',
  ],
  [
    'taste:anime',
    'anime',
  ],
  [
    'taste:adult-animation',
    'adultAnimation',
  ],
]

function dimensions(key) {
  return {
    tasteTags: [{
      key,
      label: key,
      strength: 0.82,
      confidence: 0.78,
      positiveEvidenceWeight: 3,
      negativeEvidenceWeight: 0,
      evidenceCount: 4,
      affinity: 1,
    }],
  }
}

describe(
  'expanded Taste Title fallbacks',
  () => {
    for (
      const [tasteKey, expectedId]
      of expandedTitles
    ) {
      it(
        `${tasteKey} maps to ${expectedId}`,
        () => {
          const result =
            selectTasteTitle(
              dimensions(tasteKey),
            )

          assert.ok(result)

          assert.equal(
            result.kind,
            'single',
          )

          assert.equal(
            result.id,
            expectedId,
          )

          assert.equal(
            result.tasteKey,
            tasteKey,
          )
        },
      )
    }
  },
)
