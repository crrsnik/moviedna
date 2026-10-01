import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import { deriveMovieDnaState } from '../../src/features/dna/hooks/dnaState.js'
import { createMovieDnaService } from '../../src/features/dna/services/createMovieDnaService.js'
import { resolveDimensionLabel } from '../../src/features/dna/services/dimensionLabels.js'
import { MOVIEDNA_DIMENSIONS, normalizeMovieDnaCurrent, normalizeMovieDnaRecalculation } from '../../src/features/dna/services/normalizeMovieDna.js'
import { isLocalFirebaseMode, LOCAL_EMULATORS, LOCAL_FIREBASE_CONFIG } from '../../src/shared/config/localFirebase.js'

const stamp = value => ({ toDate: () => new Date(value) })
const entry = (label, score) => ({ key: `genre:${label}`, label, score, confidence: .5, evidenceCount: 2, signedContribution: score, absoluteEvidenceWeight: 1 })
const currentData = (overrides = {}) => ({
  schemaVersion: 1, algorithmVersion: '1.0.0', status: 'ready', confidence: .7, metadataCoverage: .8,
  sourceCounts: { uniqueNonZeroUsed: 3, ratingUsed: 1, onboardingUsed: 1, favoriteUsed: 1 },
  dimensions: Object.fromEntries(MOVIEDNA_DIMENSIONS.map(name => [name, name === 'genres'
    ? [{ ...entry('Low', -.4), key: 'genre:18' }, { ...entry('High', .8), key: 'genre:35' }]
    : []])),
  calculatedAt: stamp('2026-01-01T00:00:00Z'), updatedAt: stamp('2026-01-01T00:00:00Z'), ...overrides,
})
const snapshot = data => ({ exists: () => data !== null, data: () => data, metadata: { hasPendingWrites: false } })

describe('MovieDNA read model normalization', () => {
  it('resolves every dimension to a human-readable label without changing stored identity', () => {
    assert.equal(resolveDimensionLabel('genres', { key: 'genre:18', label: '18' }), 'Drama')
    assert.equal(resolveDimensionLabel('genres', { key: 'genre:35', label: '35' }), 'Comedy')
    assert.equal(resolveDimensionLabel('genres', { key: 'genre:878', label: '878' }), 'Science Fiction')
    assert.equal(resolveDimensionLabel('genres', { key: 'genre:999999', label: '999999' }), 'Unknown genre')
    assert.equal(resolveDimensionLabel('mediaTypes', { key: 'media:movie', label: 'movie' }), 'Movies')
    assert.equal(resolveDimensionLabel('mediaTypes', { key: 'media:tv', label: 'tv' }), 'TV')
    assert.equal(resolveDimensionLabel('decades', { key: 'decade:1990', label: '1990' }), '1990s')
    assert.equal(resolveDimensionLabel('languages', { key: 'language:fr', label: 'fr' }), 'French')
    assert.equal(resolveDimensionLabel('countries', { key: 'country:US', label: 'US' }), 'United States')
    assert.equal(resolveDimensionLabel('directors', { key: 'person:1', label: 'Jane Director' }), 'Jane Director')
    assert.equal(resolveDimensionLabel('creators', { key: 'person:2', label: '2' }), 'Unknown creator')
    assert.equal(resolveDimensionLabel('actors', { key: 'person:3', label: 'Alex Actor' }), 'Alex Actor')
  })
  it('normalizes timestamps, optional counts and sorts compatibility without mutation', () => {
    const input = currentData(); const original = structuredClone(input.dimensions)
    const value = normalizeMovieDnaCurrent(snapshot(input))
    assert.equal(value.calculatedAt, '2026-01-01T00:00:00.000Z')
    assert.deepEqual(value.dimensions.genres.map(item => item.label), ['Comedy', 'Drama'])
    assert.equal(value.sourceCounts.ratingsRead, 0)
    assert.deepEqual(input.dimensions, original)
  })
  it('accepts missing dimension arrays and rejects malformed dimensions', () => {
    const value = normalizeMovieDnaCurrent(snapshot(currentData({ dimensions: {} })))
    assert.equal(value.dimensions.actors.length, 0)
    assert.throws(() => normalizeMovieDnaCurrent(snapshot(currentData({ dimensions: { genres: [{ ...entry('Bad', 2) }] } }))), { code: 'malformed' })
  })
  for (const override of [{ confidence: 2 }, { metadataCoverage: -1 }, { sourceCounts: { ratingUsed: -1 } }]) {
    it('rejects invalid confidence, coverage or counts', () => assert.throws(() => normalizeMovieDnaCurrent(snapshot(currentData(override))), { code: 'malformed' }))
  }
  it('rejects an unknown algorithm version safely', () => assert.throws(() => normalizeMovieDnaCurrent(snapshot(currentData({ algorithmVersion: '2.0.0' }))), { code: 'unsupported-version' }))
  it('normalizes recalculation timestamps and failures', () => assert.equal(normalizeMovieDnaRecalculation(snapshot({ schemaVersion: 1, status: 'failed', algorithmVersion: '1.0.0', requestedAt: stamp('2026-01-01'), startedAt: null, completedAt: stamp('2026-01-02'), errorCode: 'safe-code' })).status, 'failed'))
})

describe('MovieDNA dual subscription', () => {
  it('uses owner paths, merges snapshots, and unsubscribes both listeners', () => {
    const listeners = [], stops = [], values = []
    const service = createMovieDnaService({ database: 'db', document: (...parts) => parts.slice(1).join('/'), subscribe: (path, _options, next, error) => { listeners.push({ path, next, error }); const stop = { called: false }; stops.push(stop); return () => { stop.called = true } } })
    const unsubscribe = service.subscribe('owner', value => values.push(value))
    assert.deepEqual(listeners.map(item => item.path), ['users/owner/movieDna/current', 'users/owner/movieDna/recalculation'])
    listeners[0].next(snapshot(currentData())); assert.equal(values.length, 0)
    listeners[1].next(snapshot(null)); assert.equal(values[0].current.status, 'ready')
    unsubscribe(); assert.ok(stops.every(stop => stop.called))
    listeners[0].next(snapshot(null)); assert.equal(values.length, 1)
  })
  it('publishes safe snapshot errors after both streams resolve', () => {
    const listeners = [], values = []
    createMovieDnaService({ database: {}, document: (_db, ...path) => path.join('/'), subscribe: (_path, _options, next, error) => { listeners.push({ next, error }); return () => {} } }).subscribe('owner', value => values.push(value))
    listeners[0].error(new Error('private')); listeners[1].next(snapshot(null))
    assert.equal(values[0].error.message, 'unavailable')
  })
})

describe('MovieDNA page states', () => {
  const dna = normalizeMovieDnaCurrent(snapshot(currentData()))
  for (const [kind, value] of [['loading', { loading: true }], ['empty', {}], ['running', { recalculation: { status: 'running' } }], ['stale', { current: dna, recalculation: { status: 'running' } }], ['failed', { recalculation: { status: 'failed' } }], ['ready', { current: dna }], ['insufficient', { current: { ...dna, status: 'insufficient-data' } }]]) {
    it(`derives ${kind}`, () => assert.equal(deriveMovieDnaState({ loading: false, current: null, recalculation: null, error: null, ...value }).kind, kind))
  }
})

describe('local safety and accessible UI contract', () => {
  it('uses only demo project and loopback Emulators', () => {
    assert.equal(LOCAL_FIREBASE_CONFIG.projectId, 'demo-moviedna'); assert.deepEqual(LOCAL_EMULATORS, { auth: 'http://127.0.0.1:9099', firestoreHost: '127.0.0.1', firestorePort: 8080, functionsHost: '127.0.0.1', functionsPort: 5001 })
    assert.equal(isLocalFirebaseMode({ VITE_MOVIEDNA_LOCAL: 'true' }), true); assert.equal(isLocalFirebaseMode({ MODE: 'production' }), false)
  })
  it('renders curated human-readable DNA dimensions with accessible expandable sections', async () => {
    const page = await readFile(new URL('../../src/pages/DnaPage.jsx', import.meta.url), 'utf8')
    const dimension = await readFile(new URL('../../src/features/dna/components/DnaDimensionSection.jsx', import.meta.url), 'utf8')
    const state = await readFile(new URL('../../src/features/dna/components/DnaStatePanel.jsx', import.meta.url), 'utf8')

    const visibleDimensions = [
      'genres',
      'mediaTypes',
      'decades',
      'countries',
      'directors',
      'actors',
    ]

    for (const name of visibleDimensions) {
      assert.match(page, new RegExp(`['"]${name}['"]`))
    }

    for (const name of MOVIEDNA_DIMENSIONS.filter(name => !visibleDimensions.includes(name))) {
      assert.doesNotMatch(page, new RegExp(`['"]${name}['"]`))
    }

    for (const label of [
      'Strong match',
      'Positive match',
      'Neutral or mixed',
      'Lower compatibility',
    ]) {
      assert.match(dimension, new RegExp(label))
    }

    assert.match(dimension, /Math\.abs/)
    assert.match(dimension, /slice\(0, DEFAULT_VISIBLE\)/)
    assert.match(dimension, /Show all/)
    assert.match(dimension, /Show less/)
    assert.match(dimension, /aria-expanded=/)
    assert.match(dimension, /<progress/)
    assert.doesNotMatch(dimension, /Evidence from/)
    assert.doesNotMatch(dimension, /confidence/)
    assert.doesNotMatch(page, /DnaOverview/)
    assert.match(state, /aria-live=/)
    assert.match(page, /<h1/)
  })
  it('keeps the compact mobile header accessible without a visible account email row', async () => {
    const header = await readFile(new URL('../../src/shared/components/layout/Header.jsx', import.meta.url), 'utf8')
    for (const [path, label] of [['/movies', 'Movies'], ['/tv', 'TV Shows'], ['/actors', 'Actors'], ['/profile', 'Profile']]) {
      assert.match(header, new RegExp(`to=["']${path}["'][^>]*>${label}<`))
    }
    assert.match(header, /sr-only md:not-sr-only/)
    assert.match(header, /user\.email \|\| user\.displayName/)
    assert.match(header, /Log out/)
    assert.match(header, /grid-cols-\[auto_1fr\]/)
  })
  it('keeps seed fail-closed and free of TMDB network code', async () => {
    const seed = await readFile(new URL('../../scripts/seedDnaLocal.js', import.meta.url), 'utf8')
    assert.match(seed, /Refusing to seed/); assert.doesNotMatch(seed, /api\.themoviedb\.org|TMDB_READ_ACCESS_TOKEN/)
    const result = spawnSync(process.execPath, ['scripts/seedDnaLocal.js'], { cwd: new URL('../..', import.meta.url), env: {} })
    assert.notEqual(result.status, 0); assert.match(result.stderr.toString(), /Refusing to seed/)
  })
})
