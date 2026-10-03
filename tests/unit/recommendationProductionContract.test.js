import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  describe,
  it,
} from 'node:test'

async function source(path) {
  return readFile(
    new URL(path, import.meta.url),
    'utf8',
  )
}

describe('recommendation production contract', () => {
  it('uses the europe-west6 Functions client', async () => {
    const firebase = await source(
      '../../src/shared/config/firebase.js',
    )

    assert.match(
      firebase,
      /getFunctions\s*\(\s*firebaseApp\s*,\s*['"]europe-west6['"]\s*\)/,
    )
  })

  it('calls getRecommendations without trusting a client UID', async () => {
    const service = await source(
      '../../src/features/recommendations/services/recommendationService.js',
    )

    assert.match(
      service,
      /['"]getRecommendations['"]/,
    )

    assert.match(
      service,
      /callRecommendations:\s*\(language\)\s*=>\s*callable\s*\(\s*\{\s*language\s*\}\s*\)/,
    )

    assert.doesNotMatch(
      service,
      /\buid\b/,
    )
  })

  it('keeps App Check enforcement enabled for recommendations', async () => {
    const config = await source(
      '../../functions/src/config.js',
    )

    assert.match(
      config,
      /RECOMMENDATION_OPTIONS/,
    )

    assert.match(
      config,
      /enforceAppCheck:\s*true/,
    )
  })

  it('requires server-side Auth and App Check context', async () => {
    const handler = await source(
      '../../functions/src/recommendations/createRecommendationHandler.js',
    )

    assert.match(
      handler,
      /request\.auth\?\.uid/,
    )

    assert.match(
      handler,
      /request\.app/,
    )

    assert.match(
      handler,
      /request\.auth\.uid/,
    )
  })

  it('exports the callable with recommendation options and the TMDB secret', async () => {
    const index = await source(
      '../../functions/src/index.js',
    )

    assert.match(
      index,
      /export const getRecommendations\s*=\s*onCall/,
    )

    assert.match(
      index,
      /RECOMMENDATION_OPTIONS/,
    )

    assert.match(
      index,
      /secrets:\s*\[\s*tmdbToken\s*\]/,
    )
  })

  it('keeps real TMDB recommendation network disabled in Functions Emulator', async () => {
    const index = await source(
      '../../functions/src/index.js',
    )

    assert.match(
      index,
      /FUNCTIONS_EMULATOR/,
    )

    assert.match(
      index,
      /TMDB_UNAVAILABLE/,
    )
  })
})
