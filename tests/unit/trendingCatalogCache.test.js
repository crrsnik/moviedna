import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createTrendingCatalogCache,
} from '../../src/features/catalog/services/trendingCatalogCache.js'

describe('trending catalog cache', () => {
  it('returns fresh cached data inside TTL', () => {
    let time = 1000

    const cache = createTrendingCatalogCache({
      ttlMs: 5000,
      now: () => time,
    })

    const data = [{ id: 1 }]

    cache.set('movie', 'en-US', data)

    assert.deepEqual(
      cache.get('movie', 'en-US'),
      {
        data,
        fresh: true,
      },
    )
  })

  it('marks cached data stale after TTL', () => {
    let time = 1000

    const cache = createTrendingCatalogCache({
      ttlMs: 5000,
      now: () => time,
    })

    cache.set(
      'movie',
      'en-US',
      [{ id: 1 }],
    )

    time = 7000

    assert.equal(
      cache.get(
        'movie',
        'en-US',
      ).fresh,
      false,
    )
  })

  it('keeps movie, TV and languages separate', () => {
    const cache = createTrendingCatalogCache()

    cache.set(
      'movie',
      'en-US',
      [{ id: 1 }],
    )

    cache.set(
      'tv',
      'en-US',
      [{ id: 2 }],
    )

    assert.deepEqual(
      cache.get('movie', 'en-US').data,
      [{ id: 1 }],
    )

    assert.deepEqual(
      cache.get('tv', 'en-US').data,
      [{ id: 2 }],
    )

    assert.equal(
      cache.get('movie', 'fr-FR'),
      null,
    )
  })
})
