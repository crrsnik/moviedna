import assert from 'node:assert/strict'
import {
  readFile,
} from 'node:fs/promises'
import {
  describe,
  it,
} from 'node:test'


describe('search autocomplete UI contract', () => {
  it('uses a debounced mixed catalog search', async () => {
    const hook = await readFile(
      new URL(
        '../../src/features/catalog/hooks/useSearchAutocomplete.js',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      hook,
      /AUTOCOMPLETE_DELAY_MS\s*=\s*250/,
    )

    assert.match(
      hook,
      /type:\s*['"]all['"]/,
    )

    assert.match(
      hook,
      /AUTOCOMPLETE_LIMIT\s*=\s*8/,
    )

    assert.match(
      hook,
      /AbortController/,
    )
  })


  it('supports accessible keyboard navigation and direct detail navigation', async () => {
    const form = await readFile(
      new URL(
        '../../src/features/catalog/components/SearchForm.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      form,
      /role="combobox"/,
    )

    assert.match(
      form,
      /role="listbox"/,
    )

    assert.match(
      form,
      /role="option"/,
    )

    assert.match(
      form,
      /ArrowDown/,
    )

    assert.match(
      form,
      /ArrowUp/,
    )

    assert.match(
      form,
      /Escape/,
    )

    assert.match(
      form,
      /\/movies\//,
    )

    assert.match(
      form,
      /\/tv\//,
    )

    assert.match(
      form,
      /\/actors\//,
    )
  })
})
