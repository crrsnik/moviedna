import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('person external links UI', () => {
  it('renders external links as accessible icon buttons', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/catalog/components/PersonExternalLinks.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(source, /InstagramIcon/)
    assert.match(source, /FacebookIcon/)
    assert.match(source, /XIcon/)
    assert.match(source, /ImdbIcon/)
    assert.match(source, /GlobeIcon/)
    assert.match(source, /aria-label=\{label\}/)
    assert.match(source, /title=\{label\}/)
    assert.match(source, /rounded-full/)
  })
})
