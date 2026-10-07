import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getTasteTitleSignals,
} from '../../src/features/dna/utils/tasteTitlePresentation.js'

describe('Taste Title presentation', () => {
  it('resolves a combination title into its two taste signals', () => {
    assert.deepEqual(
      getTasteTitleSignals(
        'battleScarredHeart',
      ),
      [
        'taste:emotional-drama',
        'taste:war-drama',
      ],
    )
  })

  it('resolves a single title into one taste signal', () => {
    assert.deepEqual(
      getTasteTitleSignals(
        'fantasyAdventure',
      ),
      [
        'taste:fantasy-adventure',
      ],
    )
  })

  it('does not invent signals for an unknown title', () => {
    assert.deepEqual(
      getTasteTitleSignals(
        'unknownTasteTitle',
      ),
      [],
    )
  })
})
