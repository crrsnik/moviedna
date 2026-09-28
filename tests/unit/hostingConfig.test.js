import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const configuration = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'))

describe('Firebase Hosting configuration', () => {
  it('serves dist from the default site and excludes local files', () => {
    assert.equal(configuration.hosting.site, 'moviedna-app')
    assert.equal(configuration.hosting.public, 'dist')
    assert.ok(configuration.hosting.ignore.includes('**/node_modules/**'))
  })

  it('routes the exact TMDB prefixes before the SPA fallback', () => {
    assert.deepEqual(configuration.hosting.rewrites, [
      { source: '/api/tmdb', function: { functionId: 'tmdbProxy', region: 'europe-west6' } },
      { source: '/api/tmdb/**', function: { functionId: 'tmdbProxy', region: 'europe-west6' } },
      { source: '**', destination: '/index.html' },
    ])
    assert.equal(JSON.stringify(configuration.hosting).includes('pinTag'), false)
    assert.equal(JSON.stringify(configuration.hosting).includes('refreshMovieDna'), false)
  })

  it('retains separate Firestore Rules and indexes declarations', () => {
    assert.deepEqual(configuration.firestore, {
      database: '(default)', rules: 'firestore.rules', indexes: 'firestore.indexes.json',
    })
  })
})
