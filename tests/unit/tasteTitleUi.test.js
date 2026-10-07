import assert from 'node:assert/strict'
import {
  readFile,
} from 'node:fs/promises'
import {
  describe,
  it,
} from 'node:test'

import {
  TASTE_TITLE_COMBINATIONS,
  TASTE_TITLE_IDS,
} from '../../src/features/dna/utils/selectTasteTitle.js'

describe('Taste Title profile UI', () => {
  it(
    'derives the title from current MovieDNA',
    async () => {
      const layout = await readFile(
        new URL(
          '../../src/features/profile/components/ProfileLayout.jsx',
          import.meta.url,
        ),
        'utf8',
      )

      assert.match(
        layout,
        /useMovieDna/,
      )

      assert.match(
        layout,
        /selectTasteTitle/,
      )

      assert.match(
        layout,
        /dnaState\.current\?\.dimensions/,
      )
    },
  )

  it(
    'renders Taste Title separately from privacy',
    async () => {
      const layout = await readFile(
        new URL(
          '../../src/features/profile/components/ProfileLayout.jsx',
          import.meta.url,
        ),
        'utf8',
      )

      assert.match(
        layout,
        /profile\.tasteTitles\.\$\{tasteTitle\.id\}/,
      )

      assert.match(
        layout,
        /profile\.publicProfile/,
      )

      assert.match(
        layout,
        /profile\.privateProfile/,
      )
    },
  )

  it(
    'localizes every single and combination title',
    async () => {
      const titleIds = new Set([
        ...Object.values(
          TASTE_TITLE_IDS,
        ),
        ...Object.values(
          TASTE_TITLE_COMBINATIONS,
        ),
      ])

      assert.equal(
        titleIds.size,
        82,
      )

      for (const locale of [
        'ru',
        'en',
        'fr',
      ]) {
        const messages = await readFile(
          new URL(
            `../../src/features/localization/messages/${locale}.js`,
            import.meta.url,
          ),
          'utf8',
        )

        for (const id of titleIds) {
          assert.match(
            messages,
            new RegExp(
              `\\b${id}:`,
            ),
            `${locale} is missing ${id}`,
          )
        }
      }
    },
  )
})
