import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  createRecommendationCache,
} from '../../src/features/recommendations/services/recommendationCache.js'

describe('recommendation memory cache', () => {
  it('returns data only for the exact owner and DNA revision', () => {
    const cache = createRecommendationCache()
    const data = { results: ['a'] }

    cache.set('user-a', 'revision-1', data)

    assert.equal(
      cache.get('user-a', 'revision-1'),
      data,
    )

    assert.equal(
      cache.get('user-a', 'revision-2'),
      null,
    )

    assert.equal(
      cache.get('user-b', 'revision-1'),
      null,
    )
  })

  it('replaces the previous revision for the same owner', () => {
    const cache = createRecommendationCache()

    cache.set(
      'user-a',
      'revision-1',
      { results: ['old'] },
    )

    const fresh = {
      results: ['fresh'],
    }

    cache.set(
      'user-a',
      'revision-2',
      fresh,
    )

    assert.equal(
      cache.get('user-a', 'revision-1'),
      null,
    )

    assert.equal(
      cache.get('user-a', 'revision-2'),
      fresh,
    )
  })

  it('deduplicates concurrent loads for the same revision', async () => {
    const cache = createRecommendationCache()

    let calls = 0
    let release

    const loader = () => {
      calls += 1

      return new Promise(resolve => {
        release = resolve
      })
    }

    const first = cache.load(
      'user-a',
      'revision-1',
      loader,
    )

    const second = cache.load(
      'user-a',
      'revision-1',
      loader,
    )

    assert.equal(calls, 0)

    await Promise.resolve()

    assert.equal(calls, 1)

    release({
      results: ['fresh'],
    })

    const [a, b] = await Promise.all([
      first,
      second,
    ])

    assert.deepEqual(a, b)
    assert.equal(calls, 1)
  })

  it('uses cached data without another load', async () => {
    const cache = createRecommendationCache()

    let calls = 0

    const first = await cache.load(
      'user-a',
      'revision-1',
      async () => {
        calls += 1
        return {
          results: ['cached'],
        }
      },
    )

    const second = await cache.load(
      'user-a',
      'revision-1',
      async () => {
        calls += 1
        return {
          results: ['wrong'],
        }
      },
    )

    assert.equal(calls, 1)
    assert.equal(second, first)
  })

  it('force reload bypasses completed cache and replaces it', async () => {
    const cache = createRecommendationCache()

    cache.set(
      'user-a',
      'revision-1',
      {
        results: ['old'],
      },
    )

    let calls = 0

    const fresh = await cache.load(
      'user-a',
      'revision-1',
      async () => {
        calls += 1

        return {
          results: ['fresh'],
        }
      },
      {
        force: true,
      },
    )

    assert.equal(calls, 1)

    assert.deepEqual(
      fresh.results,
      ['fresh'],
    )

    assert.equal(
      cache.get(
        'user-a',
        'revision-1',
      ),
      fresh,
    )
  })

  it('does not cache rejected loads', async () => {
    const cache = createRecommendationCache()

    await assert.rejects(
      cache.load(
        'user-a',
        'revision-1',
        async () => {
          throw new Error('synthetic failure')
        },
      ),
      /synthetic failure/,
    )

    assert.equal(
      cache.get('user-a', 'revision-1'),
      null,
    )

    const recovered = await cache.load(
      'user-a',
      'revision-1',
      async () => ({
        results: ['recovered'],
      }),
    )

    assert.deepEqual(
      recovered.results,
      ['recovered'],
    )
  })

  it('clears only the requested owner', () => {
    const cache = createRecommendationCache()

    cache.set(
      'user-a',
      'revision-1',
      { results: ['a'] },
    )

    cache.set(
      'user-b',
      'revision-1',
      { results: ['b'] },
    )

    cache.clear('user-a')

    assert.equal(
      cache.get('user-a', 'revision-1'),
      null,
    )

    assert.deepEqual(
      cache.get(
        'user-b',
        'revision-1',
      ).results,
      ['b'],
    )
  })
})

describe('recommendation revision refresh', () => {
  it('loads once for the current revision and once again after DNA changes', async () => {
    const cache = createRecommendationCache()

    let calls = 0

    const loader = async () => {
      calls += 1

      return {
        results: [`request-${calls}`],
      }
    }

    await cache.load(
      'user-a',
      'revision-a',
      loader,
    )

    await cache.load(
      'user-a',
      'revision-a',
      loader,
    )

    assert.equal(
      calls,
      1,
    )

    await cache.load(
      'user-a',
      'revision-b',
      loader,
    )

    assert.equal(
      calls,
      2,
    )

    await cache.load(
      'user-a',
      'revision-b',
      loader,
    )

    assert.equal(
      calls,
      2,
    )
  })
})

describe('recommendation cache race safety', () => {
  it('does not let an older DNA request overwrite a newer revision', async () => {
    const cache = createRecommendationCache()

    let resolveOld
    let resolveFresh

    const oldRequest = cache.load(
      'user-a',
      'revision-a',
      () => new Promise(resolve => {
        resolveOld = resolve
      }),
    )

    await Promise.resolve()

    const freshRequest = cache.load(
      'user-a',
      'revision-b',
      () => new Promise(resolve => {
        resolveFresh = resolve
      }),
    )

    await Promise.resolve()

    resolveFresh({
      results: ['fresh'],
    })

    await freshRequest

    resolveOld({
      results: ['old'],
    })

    await oldRequest

    assert.deepEqual(
      cache.get(
        'user-a',
        'revision-b',
      ),
      {
        results: ['fresh'],
      },
    )

    assert.equal(
      cache.get(
        'user-a',
        'revision-a',
      ),
      null,
    )
  })

  it('does not repopulate an owner after clear while a request is in flight', async () => {
    const cache = createRecommendationCache()

    let resolveRequest

    const request = cache.load(
      'user-a',
      'revision-a',
      () => new Promise(resolve => {
        resolveRequest = resolve
      }),
    )

    await Promise.resolve()

    cache.clear('user-a')

    resolveRequest({
      results: ['late'],
    })

    await request

    assert.equal(
      cache.get(
        'user-a',
        'revision-a',
      ),
      null,
    )
  })

  it('keeps concurrent owners completely isolated', async () => {
    const cache = createRecommendationCache()

    await Promise.all([
      cache.load(
        'user-a',
        'same-revision',
        async () => ({
          results: ['a'],
        }),
      ),
      cache.load(
        'user-b',
        'same-revision',
        async () => ({
          results: ['b'],
        }),
      ),
    ])

    assert.deepEqual(
      cache.get(
        'user-a',
        'same-revision',
      ).results,
      ['a'],
    )

    assert.deepEqual(
      cache.get(
        'user-b',
        'same-revision',
      ).results,
      ['b'],
    )
  })
})
