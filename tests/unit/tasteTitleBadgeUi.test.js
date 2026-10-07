import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('Taste Title badge UI', () => {
  it('is an interactive medal with an explanatory popover', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/dna/components/TasteTitleBadge.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /aria-haspopup="dialog"/,
    )

    assert.match(
      source,
      /aria-expanded=\{open\}/,
    )

    assert.match(
      source,
      /role="dialog"/,
    )

    assert.match(
      source,
      /getTasteTitleSignals/,
    )

    assert.match(
      source,
      /event\.key === 'Escape'/,
    )

    assert.match(
      source,
      /pointerdown/,
    )

    assert.match(
      source,
      />\s*★\s*</,
    )
  })
})
