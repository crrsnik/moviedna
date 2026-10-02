import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import {
  createRecommendationHandler,
} from '../../functions/src/recommendations/createRecommendationHandler.js'

import {
  createRecommendationTmdbClient,
} from '../../functions/src/recommendations/tmdb/recommendationTmdbClient.js'

const dna = {
  schemaVersion: 1,
  algorithmVersion: '1.0.0',
  dimensions: {},
}

function request(language) {
  return {
    auth: { uid: 'alice' },
    app: { appId: 'test-app' },
    data: { language },
  }
}

describe('recommendation localization contract', () => {
  it('forwards supported languages from callable to pipeline', async () => {
    const languages = []

    const handler = createRecommendationHandler({
      loadContext: async () => ({
        dna,
        rated: [],
      }),
      pipeline: {
        async run(input) {
          languages.push(input.language)

          return {
            algorithmVersion: '1.0.0',
            results: [],
          }
        },
      },
    })

    await handler(request('fr-FR'))
    await handler(request('ru-RU'))

    assert.deepEqual(
      languages,
      ['fr-FR', 'ru-RU'],
    )
  })

  it('rejects unsupported callable languages', async () => {
    let contextLoaded = false

    const handler = createRecommendationHandler({
      loadContext: async () => {
        contextLoaded = true

        return {
          dna,
          rated: [],
        }
      },
      pipeline: {
        async run() {
          return {
            algorithmVersion: '1.0.0',
            results: [],
          }
        },
      },
    })

    await assert.rejects(
      handler(request('de-DE')),
      error => error?.code === 'invalid-argument',
    )

    assert.equal(contextLoaded, false)
  })

  it('sends FR and RU languages to TMDB source requests', async () => {
    const urls = []

    const client = createRecommendationTmdbClient({
      token: 'synthetic-token',
      fetchImpl: async url => {
        urls.push(String(url))

        return new Response(
          JSON.stringify({
            results: [],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        )
      },
    })

    await client.getTrending(
      'movie',
      'fr-FR',
    )

    await client.getPopular(
      'tv',
      2,
      'ru-RU',
    )

    assert.equal(
      urls[0],
      'https://api.themoviedb.org/3/trending/movie/day?language=fr-FR',
    )

    assert.equal(
      urls[1],
      'https://api.themoviedb.org/3/tv/popular?language=ru-RU&page=2',
    )
  })

  it('rejects unsupported TMDB source language before fetch', async () => {
    let fetchCount = 0

    const client = createRecommendationTmdbClient({
      token: 'synthetic-token',
      fetchImpl: async () => {
        fetchCount += 1

        return new Response(
          JSON.stringify({
            results: [],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        )
      },
    })

    await assert.rejects(
      client.getTrending(
        'movie',
        'de-DE',
      ),
    )

    assert.equal(fetchCount, 0)
  })

  it('propagates language through every recommendation source type', async () => {
    const source = await readFile(
      new URL(
        '../../functions/src/recommendations/recommendationPipeline.js',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /getTrending\(\s*request\.mediaType,\s*language,\s*\)/,
    )

    assert.match(
      source,
      /getPopular\(\s*request\.mediaType,\s*request\.page,\s*language,\s*\)/,
    )

    assert.match(
      source,
      /getTopRated\(\s*request\.mediaType,\s*request\.page,\s*language,\s*\)/,
    )

    assert.match(
      source,
      /discoverByGenre\(\s*request\.mediaType,\s*request\.genreId,\s*request\.page,\s*language,\s*\)/,
    )
  })
})
