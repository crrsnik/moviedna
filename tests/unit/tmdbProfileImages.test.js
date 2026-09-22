import { it } from 'node:test'
import assert from 'node:assert/strict'
import { getTmdbProfileUrl } from '../../src/features/catalog/services/tmdbImages.js'
for (const size of ['w45', 'w185', 'h632', 'original']) it(`allows profile size ${size}`, () => assert.equal(getTmdbProfileUrl('/safe.jpg', size), `https://image.tmdb.org/t/p/${size}/safe.jpg`))
for (const path of [null, '', 'https://evil.invalid/a.jpg', '//evil.invalid/a.jpg', '/../a.jpg', '/%2e%2e/a.jpg', '/a.jpg?evil=1', '/a.svg', '/a/b.jpg']) it(`rejects profile path ${path}`, () => assert.equal(getTmdbProfileUrl(path), null))
it('rejects unknown profile size', () => assert.equal(getTmdbProfileUrl('/safe.jpg', 'w500'), null))
it('defaults profile size', () => assert.equal(getTmdbProfileUrl('/safe.jpg'), 'https://image.tmdb.org/t/p/w185/safe.jpg'))
