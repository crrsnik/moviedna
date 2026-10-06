import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRecommendationHandler } from '../../functions/src/recommendations/createRecommendationHandler.js'
import {
  MovieDnaServerError,
  SERVER_ERROR_CODES,
} from '../../functions/src/errors.js'

function request(overrides = {}) {
  return {
    auth: { uid: 'alice' },
    app: { appId: 'test-app' },
    ...overrides,
  }
}

describe('recommendation callable handler', () => {
  it('loads the authenticated user context and runs the pipeline', async () => {
    const dna = {
      schemaVersion: 1,
      algorithmVersion: '1.0.0',
      dimensions: {},
    }

    const rated = [{
      tmdbId: 1,
      mediaType: 'movie',
    }]

    const calls = []

    const handler = createRecommendationHandler({
      loadContext: async uid => {
        assert.equal(uid, 'alice')
        return { dna, rated }
      },
      pipeline: {
        async run(input) {
          calls.push(input)

          return {
            algorithmVersion: '1.0.0',
            results: [],
          }
        },
      },
    })

    const result = await handler(request())

    assert.deepEqual(result, {
      algorithmVersion: '1.0.0',
      results: [],
    })

    assert.deepEqual(calls, [{
      dna,
      rated,
      seedSignals: [],
      watched: [],
      hidden: [],
      language: 'en-US',
    }])
  })

  it('rejects unauthenticated requests before loading context', async () => {
    let called = false

    const handler = createRecommendationHandler({
      loadContext: async () => {
        called = true
        return null
      },
      pipeline: {
        run: async () => null,
      },
    })

    await assert.rejects(
      handler(request({ auth: null })),
      error => error.code === 'unauthenticated',
    )

    assert.equal(called, false)
  })

  it('requires App Check before loading context', async () => {
    let called = false

    const handler = createRecommendationHandler({
      loadContext: async () => {
        called = true
        return null
      },
      pipeline: {
        run: async () => null,
      },
    })

    await assert.rejects(
      handler(request({ app: null })),
      error => error.code === 'failed-precondition',
    )

    assert.equal(called, false)
  })

  it('returns failed-precondition when MovieDNA context is unavailable', async () => {
    const handler = createRecommendationHandler({
      loadContext: async () => ({
        dna: null,
        rated: [],
      }),
      pipeline: {
        run: async () => null,
      },
    })

    await assert.rejects(
      handler(request()),
      error => (
        error.code === 'failed-precondition'
        && !error.message.includes('invalid-context')
      ),
    )
  })

  it('maps TMDB timeout to a safe unavailable error', async () => {
    const handler = createRecommendationHandler({
      loadContext: async () => ({
        dna: {
          schemaVersion: 1,
          algorithmVersion: '1.0.0',
          dimensions: {},
        },
        rated: [],
      }),
      pipeline: {
        async run() {
          throw new MovieDnaServerError(
            SERVER_ERROR_CODES.TIMEOUT,
          )
        },
      },
    })

    await assert.rejects(
      handler(request()),
      error => error.code === 'unavailable',
    )
  })

  it('does not expose unexpected raw errors', async () => {
    const handler = createRecommendationHandler({
      loadContext: async () => ({
        dna: {
          schemaVersion: 1,
          algorithmVersion: '1.0.0',
          dimensions: {},
        },
        rated: [],
      }),
      pipeline: {
        async run() {
          throw new Error('PRIVATE_INTERNAL_DETAILS')
        },
      },
    })

    await assert.rejects(
      handler(request()),
      error => (
        error.code === 'internal'
        && !error.message.includes('PRIVATE')
      ),
    )
  })

  it('rejects invalid dependencies at construction time', () => {
    assert.throws(
      () => createRecommendationHandler(),
      TypeError,
    )

    assert.throws(
      () => createRecommendationHandler({
        loadContext: async () => null,
        pipeline: {},
      }),
      TypeError,
    )
  })
})
