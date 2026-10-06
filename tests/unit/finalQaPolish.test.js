import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import {
  translate,
} from '../../src/features/localization/core/localization.js'

describe('final QA polish', () => {
  it('translates the Favorites library view in every locale', () => {
    assert.equal(
      translate('en', 'library.views.favorites'),
      'Favorites',
    )
    assert.equal(
      translate('fr', 'library.views.favorites'),
      'Favoris',
    )
    assert.equal(
      translate('ru', 'library.views.favorites'),
      'Избранное',
    )
  })

  it('highlights the larger Movies vs TV statistic', async () => {
    const source = await readFile(
      new URL(
        '../../src/pages/StatisticsPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /mediaTypes\.movieCount >= mediaTypes\.tvCount/,
    )
    assert.match(
      source,
      /mediaTypes\.tvCount >= mediaTypes\.movieCount/,
    )
    assert.match(
      source,
      /\$\{movieBarClass\}/,
    )
    assert.match(
      source,
      /\$\{tvBarClass\}/,
    )
  })
})
