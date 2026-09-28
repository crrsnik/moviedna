import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  initializeFirebaseAppCheck,
  resolveAppCheckSettings,
} from '../../src/shared/config/firebaseAppCheck.js'

const siteKey = 'synthetic-public-site-key'

describe('Firebase App Check configuration', () => {
  it('requires the public reCAPTCHA Enterprise site key', () => {
    assert.throws(
      () => resolveAppCheckSettings({ PROD: true }),
      /VITE_FIREBASE_APPCHECK_SITE_KEY/,
    )
  })

  it('does not enable a debug token outside development', () => {
    assert.deepEqual(resolveAppCheckSettings({
      PROD: true,
      VITE_FIREBASE_APPCHECK_SITE_KEY: ` ${siteKey} `,
      VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: 'synthetic-private-debug-token',
    }), { siteKey, debugToken: null })
  })

  it('supports explicit development debug-token modes', () => {
    assert.equal(resolveAppCheckSettings({
      DEV: true,
      VITE_FIREBASE_APPCHECK_SITE_KEY: siteKey,
      VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: 'true',
    }).debugToken, true)
    assert.equal(resolveAppCheckSettings({
      DEV: true,
      VITE_FIREBASE_APPCHECK_SITE_KEY: siteKey,
      VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: 'synthetic-private-debug-token',
    }).debugToken, 'synthetic-private-debug-token')
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
    const environment = { DEV: false, VITE_FIREBASE_APPCHECK_SITE_KEY: siteKey }

    const first = initializeFirebaseAppCheck(app, environment, dependencies)
    const second = initializeFirebaseAppCheck(app, environment, dependencies)

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
