import assert from 'node:assert/strict'
import {
  readFile,
} from 'node:fs/promises'

import {
  describe,
  it,
} from 'node:test'

describe(
  'public profile achievement contract',
  () => {
    it(
      'renders achievements inside accessible public preview',
      async () => {
        const source = await readFile(
          new URL(
            '../../src/pages/PublicProfilePage.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          source,
          /<AchievementsSection/,
        )

        assert.match(
          source,
          /publicView/,
        )

        assert.match(
          source,
          /data: achievements/,
        )
      },
    )

    it(
      'keeps the existing private-profile access gate',
      async () => {
        const source = await readFile(
          new URL(
            '../../src/pages/PublicProfilePage.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          source,
          /friendshipState\.status !== 'friends'/,
        )

        assert.match(
          source,
          /<PublicPreview/,
        )
      },
    )

    it(
      'places achievements between DNA and statistics',
      async () => {
        const source = await readFile(
          new URL(
            '../../src/pages/PublicProfilePage.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        const dna = source.indexOf(
          '<DnaPreview traits={publicDnaTraits(dna)} />',
        )

        const achievements =
          source.indexOf(
            '<AchievementsSection',
          )

        const statistics =
          source.indexOf(
            "'profile.public.statisticsTitle'",
          )

        assert.ok(dna >= 0)
        assert.ok(achievements > dna)
        assert.ok(
          statistics > achievements,
        )
      },
    )
  },
)
