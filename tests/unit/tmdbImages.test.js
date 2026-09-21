import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getTmdbPosterUrl } from '../../src/features/catalog/services/tmdbImages.js'

describe('TMDB poster URLs', () => {
  it('uses the fixed CDN and default w342 size', () => assert.equal(getTmdbPosterUrl('/demo-A_1.jpg'), 'https://image.tmdb.org/t/p/w342/demo-A_1.jpg'))
  it('allows w500', () => assert.equal(getTmdbPosterUrl('/demo.png', 'w500'), 'https://image.tmdb.org/t/p/w500/demo.png'))
  for (const path of [null, undefined, '', 12, {}, 'https://example.invalid/a.jpg', '//evil/a.jpg', '/../a.jpg', '/%2e%2e/a.jpg', '/folder/a.jpg', '/demo.jpg?token=x', '/demo.jpg#fragment', '/demo.svg', '/demo\\a.jpg']) {
    it(`rejects invalid path ${JSON.stringify(path)}`, () => assert.equal(getTmdbPosterUrl(path), null))
  }
  for (const size of ['original', '../original', 'w999', null]) {
    it(`rejects unsupported size ${JSON.stringify(size)}`, () => assert.equal(getTmdbPosterUrl('/demo.jpg', size), null))
  }
})
