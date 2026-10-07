import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  TASTE_COMBINATION_THRESHOLDS,
  TASTE_TITLE_COMBINATIONS,
  TASTE_TITLE_IDS,
  TASTE_TITLE_THRESHOLDS,
} from '../../src/features/dna/utils/selectTasteTitle.js'

import {
  PUBLIC_TASTE_COMBINATION_THRESHOLDS,
  PUBLIC_TASTE_TITLE_COMBINATIONS,
  PUBLIC_TASTE_TITLE_IDS,
  PUBLIC_TASTE_TITLE_THRESHOLDS,
} from '../../functions/src/profilePreview/publicTasteTitle.js'

describe(
  'public and private Taste Title parity',
  () => {
    it(
      'uses identical single title definitions',
      () => {
        assert.deepEqual(
          PUBLIC_TASTE_TITLE_IDS,
          TASTE_TITLE_IDS,
        )
      },
    )

    it(
      'uses identical combination definitions',
      () => {
        assert.deepEqual(
          PUBLIC_TASTE_TITLE_COMBINATIONS,
          TASTE_TITLE_COMBINATIONS,
        )
      },
    )

    it(
      'uses identical eligibility thresholds',
      () => {
        assert.deepEqual(
          PUBLIC_TASTE_TITLE_THRESHOLDS,
          TASTE_TITLE_THRESHOLDS,
        )

        assert.deepEqual(
          PUBLIC_TASTE_COMBINATION_THRESHOLDS,
          TASTE_COMBINATION_THRESHOLDS,
        )
      },
    )
  },
)
