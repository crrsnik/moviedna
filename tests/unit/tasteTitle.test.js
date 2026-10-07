import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  selectTasteTitle,
  TASTE_TITLE_THRESHOLDS,
} from '../../src/features/dna/utils/selectTasteTitle.js'

function taste(
  key,
  {
    strength = 0.8,
    confidence = 0.8,
    positiveEvidenceWeight = 2,
    evidenceCount = 3,
  } = {},
) {
  return {
    key,
    strength,
    confidence,
    positiveEvidenceWeight,
    evidenceCount,
  }
}

describe('MovieDNA Taste Title', () => {
  it(
    'uses a curated combination when two strong tastes support it',
    () => {
      const title = selectTasteTitle({
        tasteTags: [
          taste(
            'taste:psychological-thriller',
            {
              strength: 0.9,
            },
          ),
          taste(
            'taste:philosophical-sci-fi',
            {
              strength: 0.82,
            },
          ),
        ],
      })

      assert.equal(
        title.id,
        'mindArchitect',
      )

      assert.equal(
        title.kind,
        'combination',
      )

      assert.deepEqual(
        [...title.tasteKeys],
        [
          'taste:psychological-thriller',
          'taste:philosophical-sci-fi',
        ],
      )
    },
  )

  it(
    'can find a useful combination beyond the first two tastes',
    () => {
      const title = selectTasteTitle({
        tasteTags: [
          taste(
            'taste:crime-thriller',
            {
              strength: 0.94,
            },
          ),
          taste(
            'taste:space-sci-fi',
            {
              strength: 0.88,
            },
          ),
          taste(
            'taste:philosophical-sci-fi',
            {
              strength: 0.8,
            },
          ),
        ],
      })

      assert.equal(
        title.id,
        'cosmicPhilosopher',
      )

      assert.equal(
        title.kind,
        'combination',
      )
    },
  )

  it(
    'chooses the best-supported curated pair',
    () => {
      const title = selectTasteTitle({
        tasteTags: [
          taste(
            'taste:psychological-thriller',
            {
              strength: 0.9,
              confidence: 0.9,
            },
          ),
          taste(
            'taste:crime-thriller',
            {
              strength: 0.84,
              confidence: 0.85,
            },
          ),
          taste(
            'taste:dark-comedy',
            {
              strength: 0.65,
              confidence: 0.7,
            },
          ),
        ],
      })

      assert.equal(
        title.id,
        'criminalProfiler',
      )
    },
  )

  it(
    'falls back to the strongest single taste when no curated pair exists',
    () => {
      const title = selectTasteTitle({
        tasteTags: [
          taste(
            'taste:crime-thriller',
            {
              strength: 0.9,
            },
          ),
          taste(
            'taste:space-sci-fi',
            {
              strength: 0.82,
            },
          ),
        ],
      })

      assert.equal(
        title.id,
        'crimeThriller',
      )

      assert.equal(
        title.kind,
        'single',
      )
    },
  )

  it(
    'does not force a combination from a weak secondary signal',
    () => {
      const title = selectTasteTitle({
        tasteTags: [
          taste(
            'taste:psychological-thriller',
            {
              strength: 0.9,
            },
          ),
          taste(
            'taste:philosophical-sci-fi',
            {
              strength: 0.57,
              confidence: 0.8,
            },
          ),
        ],
      })

      assert.equal(
        title.id,
        'psychologicalThriller',
      )

      assert.equal(
        title.kind,
        'single',
      )
    },
  )

  it(
    'does not award a title from one weak signal',
    () => {
      assert.equal(
        selectTasteTitle({
          tasteTags: [
            taste(
              'taste:emotional-drama',
              {
                strength: 0.95,
                confidence: 0.9,
                positiveEvidenceWeight: 0.9,
                evidenceCount: 1,
              },
            ),
          ],
        }),
        null,
      )
    },
  )

  it(
    'does not create a title from negative taste',
    () => {
      assert.equal(
        selectTasteTitle({
          tasteTags: [
            taste(
              'taste:slasher',
              {
                strength: -0.9,
                confidence: 0.9,
                positiveEvidenceWeight: 0,
                evidenceCount: 5,
              },
            ),
          ],
        }),
        null,
      )
    },
  )

  it(
    'requires confidence even with strong affinity',
    () => {
      assert.equal(
        selectTasteTitle({
          tasteTags: [
            taste(
              'taste:space-sci-fi',
              {
                strength: 0.8,
                confidence:
                  TASTE_TITLE_THRESHOLDS
                    .confidence - 0.01,
              },
            ),
          ],
        }),
        null,
      )
    },
  )

  it(
    'ignores unknown future taste tags safely',
    () => {
      const title = selectTasteTitle({
        tasteTags: [
          taste(
            'taste:not-yet-supported',
            {
              strength: 0.99,
            },
          ),
          taste(
            'taste:emotional-drama',
            {
              strength: 0.8,
            },
          ),
        ],
      })

      assert.equal(
        title.id,
        'emotionalDrama',
      )
    },
  )

  it(
    'returns null without taste data',
    () => {
      assert.equal(
        selectTasteTitle({}),
        null,
      )

      assert.equal(
        selectTasteTitle(null),
        null,
      )
    },
  )
})
