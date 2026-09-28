import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  initializeFirebaseAppCheck,
  resolveAppCheckSettings,
} from '../../src/shared/config/firebaseAppCheck.js'
import { enableFirebaseAppCheckDebug } from '../../src/shared/config/firebaseAppCheckDebug.js'

const siteKey = 'synthetic-public-site-key'

describe('Firebase App Check configuration', () => {
  it('requires the public reCAPTCHA Enterprise site key', () => {
    assert.throws(
      () => resolveAppCheckSettings({ PROD: true }),
      /VITE_FIREBASE_APPCHECK_SITE_KEY/,
    )
  })

  it('keeps production settings limited to the public site key', () => {
    assert.deepEqual(resolveAppCheckSettings(` ${siteKey} `), { siteKey })
  })

  it('enables debug mode only through the isolated development helper', () => {
    const registry = {}
    assert.equal(enableFirebaseAppCheckDebug('', registry), false)
    assert.equal(enableFirebaseAppCheckDebug('true', registry), true)
    assert.equal(registry.FIREBASE_APPCHECK_DEBUG_TOKEN, true)
    assert.equal(enableFirebaseAppCheckDebug('synthetic-private-debug-token', registry), true)
    assert.equal(registry.FIREBASE_APPCHECK_DEBUG_TOKEN, 'synthetic-private-debug-token')
  })

  it('initializes once with auto refresh and reuses the instance across HMR evaluation', () => {
    const app = { name: '[DEFAULT]' }
    const registry = {}
    const calls = []
    class Provider {
      constructor(value) { this.siteKey = value }
    }
    const initialize = (receivedApp, options) => {
      calls.push({ receivedApp, options })
      return { kind: 'app-check' }
    }
    const dependencies = { initialize, Provider, registry }
    const first = initializeFirebaseAppCheck(app, siteKey, dependencies)
    const second = initializeFirebaseAppCheck(app, siteKey, dependencies)

    assert.equal(first, second)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].receivedApp, app)
    assert.equal(calls[0].options.provider.siteKey, siteKey)
    assert.equal(calls[0].options.isTokenAutoRefreshEnabled, true)
  })
})

describe('Firestore metadata TTL policy', () => {
  it('declares only the mediaSignals expiresAt TTL field override', () => {
    const configuration = JSON.parse(readFileSync(
      new URL('../../firestore.indexes.json', import.meta.url),
      'utf8',
    ))
    assert.deepEqual(configuration, {
      indexes: [],
      fieldOverrides: [{
        collectionGroup: 'mediaSignals',
        fieldPath: 'expiresAt',
        ttl: true,
        indexes: [],
      }],
    })
  })
})
