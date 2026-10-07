import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  selectTasteTitle,
} from '../../src/features/dna/utils/selectTasteTitle.js'

const combinations = [
  [
    'taste:romantic-drama',
    'taste:emotional-drama',
    'heartOnSleeve',
  ],
  [
    'taste:romantic-drama',
    'taste:historical-period',
    'periodRomantic',
  ],
  [
    'taste:romantic-drama',
    'taste:war-drama',
    'wartimeRomantic',
  ],
  [
    'taste:romantic-drama',
    'taste:fantasy-adventure',
    'enchantedRomantic',
  ],
  [
    'taste:romantic-comedy',
    'taste:coming-of-age',
    'romcomDreamer',
  ],
  [
    'taste:romantic-comedy',
    'taste:dark-comedy',
    'romanticSatirist',
  ],
  [
    'taste:romantic-comedy',
    'taste:russian-romantic-tv',
    'serialRomantic',
  ],
  [
    'taste:mystery-detective',
    'taste:psychological-thriller',
    'mindDetective',
  ],
  [
    'taste:mystery-detective',
    'taste:crime-thriller',
    'masterDetective',
  ],
  [
    'taste:mystery-detective',
    'taste:supernatural-horror',
    'paranormalDetective',
  ],
  [
    'taste:mystery-detective',
    'taste:historical-period',
    'periodDetective',
  ],
  [
    'taste:action-spectacle',
    'taste:dystopian-sci-fi',
    'rebellionJunkie',
  ],
  [
    'taste:action-spectacle',
    'taste:space-sci-fi',
    'spaceRanger',
  ],
  [
    'taste:action-spectacle',
    'taste:crime-thriller',
    'urbanHunter',
  ],
  [
    'taste:fantasy-adventure',
    'taste:coming-of-age',
    'chosenOne',
  ],
  [
    'taste:fantasy-adventure',
    'taste:space-sci-fi',
    'worldHopper',
  ],
  [
    'taste:fantasy-adventure',
    'taste:dark-comedy',
    'chaoticAdventurer',
  ],
  [
    'taste:dark-fantasy',
    'taste:supernatural-horror',
    'gothicNightmare',
  ],
  [
    'taste:dark-fantasy',
    'taste:slasher',
    'darkSurvivor',
  ],
  [
    'taste:historical-period',
    'taste:war-drama',
    'warHistorian',
  ],
  [
    'taste:historical-period',
    'taste:emotional-drama',
    'periodSoul',
  ],
  [
    'taste:war-drama',
    'taste:emotional-drama',
    'battleScarredHeart',
  ],
  [
    'taste:anime',
    'taste:philosophical-sci-fi',
    'animePhilosopher',
  ],
  [
    'taste:anime',
    'taste:coming-of-age',
    'animeDreamer',
  ],
  [
    'taste:adult-animation',
    'taste:dark-comedy',
    'animatedSatirist',
  ],
  [
    'taste:adult-animation',
    'taste:philosophical-sci-fi',
    'animatedPhilosopher',
  ],
]

function entry(key, strength = 0.82) {
  return {
    key,
    label: key,
    strength,
    confidence: 0.8,
    positiveEvidenceWeight: 3,
    negativeEvidenceWeight: 0,
    evidenceCount: 4,
    affinity: 1,
  }
}

describe(
  'expanded Taste Title combinations',
  () => {
    for (
      const [
        left,
        right,
        expectedId,
      ] of combinations
    ) {
      it(
        `${left} + ${right} -> ${expectedId}`,
        () => {
          const result =
            selectTasteTitle({
              tasteTags: [
                entry(left),
                entry(right),
              ],
            })

          assert.ok(result)

          assert.equal(
            result.kind,
            'combination',
          )

          assert.equal(
            result.id,
            expectedId,
          )

          assert.deepEqual(
            new Set(result.tasteKeys),
            new Set([left, right]),
          )
        },
      )
    }
  },
)
