import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DNA_PREVIEW_MAX_TRAITS,
  selectDnaPreviewTraits,
} from '../../src/features/dna/utils/selectDnaPreviewTraits.js'

function entry(key, label, score, confidence = 0.5) {
  return {
    key,
    label,
    score,
    confidence,
  }
}

describe('Smart MovieDNA preview traits', () => {
  it('prefers strong signals from different dimensions', () => {
    const traits = selectDnaPreviewTraits({
      genres: [
        entry('genre:18', 'Drama', 0.9),
        entry('genre:35', 'Comedy', 0.8),
      ],
      mediaTypes: [
        entry('media:movie', 'Movies', 0.7),
      ],
      decades: [
        entry('decade:1990', '1990s', 0.6),
      ],
      directors: [
        entry('person:1', 'Director', 0.5),
      ],
      actors: [
        entry('person:2', 'Actor', 0.4),
      ],
    })

    assert.equal(traits.length, DNA_PREVIEW_MAX_TRAITS)
    assert.deepEqual(
      traits.map(trait => trait.label),
      ['Drama', 'Movies', '1990s', 'Director'],
    )
    assert.equal(
      traits.filter(trait => trait.dimension === 'genres').length,
      1,
    )
  })

  it('fills remaining places when only a few dimensions have evidence', () => {
    const traits = selectDnaPreviewTraits({
      genres: [
        entry('genre:18', 'Drama', 0.9),
        entry('genre:35', 'Comedy', 0.8),
        entry('genre:53', 'Thriller', 0.7),
      ],
      directors: [
        entry('person:1', 'Director', 0.6),
      ],
    })

    assert.deepEqual(
      traits.map(trait => trait.label),
      ['Drama', 'Director', 'Comedy', 'Thriller'],
    )
  })

  it('excludes negative, neutral, technical and malformed signals', () => {
    const traits = selectDnaPreviewTraits({
      genres: [
        entry('genre:27', 'Horror', -0.9),
        entry('genre:18', 'Drama', 0),
        entry('genre:35', 'Comedy', 0.5),
      ],
      languages: [
        entry('language:fr', 'French', 0.9),
      ],
      creators: [
        entry('person:7', 'Creator', 0.8),
      ],
      actors: [
        { key: 'person:8', label: '', score: 0.7, confidence: 0.5 },
      ],
    })

    assert.deepEqual(
      traits.map(trait => trait.label),
      ['Comedy'],
    )
  })

  it('uses confidence and stable dimension order to break score ties', () => {
    const traits = selectDnaPreviewTraits({
      genres: [
        entry('genre:18', 'Drama', 0.6, 0.8),
      ],
      countries: [
        entry('country:FR', 'France', 0.6, 0.9),
      ],
      directors: [
        entry('person:1', 'Director', 0.6, 0.8),
      ],
    })

    assert.deepEqual(
      traits.map(trait => trait.label),
      ['France', 'Drama', 'Director'],
    )
  })

  it('returns an empty preview for absent DNA dimensions', () => {
    assert.deepEqual(selectDnaPreviewTraits(null), [])
    assert.deepEqual(selectDnaPreviewTraits({}), [])
  })
})
