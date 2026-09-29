import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const assetDirectory = new URL('../../dist/assets/', import.meta.url)
const bundle = readdirSync(assetDirectory)
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(new URL(file, assetDirectory), 'utf8'))
  .join('\n')

describe('production bundle boundaries', () => {
  it('does not contain MovieDNA debug configuration or assignment', () => {
    assert.equal(bundle.includes('VITE_FIREBASE_APPCHECK_DEBUG_TOKEN'), false)
    assert.equal(bundle.includes('synthetic-private-debug-token'), false)
  })

  it('does not contain server DNA core or TMDB credentials', () => {
    for (const marker of [
      'calculateMovieDna',
      'buildMovieDna',
      'TMDB_READ_ACCESS_TOKEN',
      'Bearer synthetic',
      'demo-moviedna-emulator-only',
      'dna.local@demo.invalid',
      '127.0.0.1:9099',
    ]) {
      assert.equal(bundle.includes(marker), false)
    }
  })
})
