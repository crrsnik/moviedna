import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getDnaTraitColor,
} from '../../src/features/dna/utils/dnaTraitColors.js'

describe('DNA visual identity', () => {
  it('gives movies and TV distinct colors', () => {
    const movie = getDnaTraitColor({
      dimension: 'mediaTypes',
      key: 'movie',
      label: 'Movies',
    })

    const tv = getDnaTraitColor({
      dimension: 'mediaTypes',
      key: 'tv',
      label: 'TV',
    })

    assert.equal(movie, '#3b82d0')
    assert.equal(tv, '#8a67cf')
    assert.notEqual(movie, tv)
  })

  it('uses vibe-specific genre colors', () => {
    assert.equal(
      getDnaTraitColor({
        dimension: 'genres',
        key: 10749,
        label: 'Romance',
      }),
      '#e56d9c',
    )

    assert.equal(
      getDnaTraitColor({
        dimension: 'genres',
        key: 27,
        label: 'Horror',
      }),
      '#9b3d4f',
    )

    assert.equal(
      getDnaTraitColor({
        dimension: 'genres',
        key: 878,
        label: 'Science Fiction',
      }),
      '#4f86e8',
    )
  })

  it('keeps fallback colors stable', () => {
    const first = getDnaTraitColor({
      dimension: 'actors',
      key: '123',
      label: 'Actor',
    })

    const second = getDnaTraitColor({
      dimension: 'actors',
      key: '123',
      label: 'Actor',
    })

    assert.equal(first, second)
  })
  it('renders the custom bar as an accessible progressbar', async () => {
    const { readFile } = await import('node:fs/promises')

    const source = await readFile(
      new URL(
        '../../src/features/dna/components/DnaTraitBar.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(source, /role="progressbar"/)
    assert.match(source, /aria-valuemin="0"/)
    assert.match(source, /aria-valuemax="100"/)
    assert.match(
      source,
      /aria-valuenow=\{normalizedPercent\}/,
    )
    assert.match(source, /getDnaTraitColor/)
  })

})
