import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  sortDnaEntriesForDisplay,
} from '../../src/features/dna/utils/sortDnaEntriesForDisplay.js'

function entry(label, score, confidence = 0.5) {
  return {
    key: label.toLowerCase(),
    label,
    score,
    confidence,
  }
}

describe('MovieDNA display sorting', () => {
  it('shows positive preferences before neutral and negative signals', () => {
    const result = sortDnaEntriesForDisplay([
      entry('Strong dislike', -0.9),
      entry('Weak positive', 0.1),
      entry('Strong positive', 0.8),
      entry('Neutral', 0),
    ])

    assert.deepEqual(
      result.map(item => item.label),
      [
        'Strong positive',
        'Weak positive',
        'Neutral',
        'Strong dislike',
      ],
    )
  })

  it('uses confidence and then label as deterministic tie breakers', () => {
    const result = sortDnaEntriesForDisplay([
      entry('Zulu', 0.4, 0.7),
      entry('Beta', 0.4, 0.9),
      entry('Alpha', 0.4, 0.7),
    ])

    assert.deepEqual(
      result.map(item => item.label),
      [
        'Beta',
        'Alpha',
        'Zulu',
      ],
    )
  })

  it('does not mutate the normalized DNA array', () => {
    const input = [
      entry('Low', -0.4),
      entry('High', 0.7),
    ]

    const original = [...input]
    const result = sortDnaEntriesForDisplay(input)

    assert.deepEqual(input, original)
    assert.notStrictEqual(result, input)
    assert.deepEqual(
      result.map(item => item.label),
      ['High', 'Low'],
    )
  })
})
