import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import { excludeKnownMedia, rankRecommendations, recommendationMediaKey } from '../../functions/src/recommendations/core/rankRecommendations.js'
import { RECOMMENDATION_ALGORITHM_VERSION, RECOMMENDATION_DIMENSION_WEIGHTS } from '../../functions/src/recommendations/core/recommendationConstants.js'
import { RECOMMENDATION_ERROR_CODES, RecommendationError } from '../../functions/src/recommendations/core/recommendationErrors.js'

const entry = (key, score = 1, confidence = 1) => ({ key, label: key, score, confidence })
const dna = (overrides = {}) => ({ schemaVersion: 1, algorithmVersion: '1.0.0', dimensions: {
  genres: [entry('genre:28')], mediaTypes: [entry('media:movie'), entry('media:tv', 0.5, 0.6)],
  decades: [entry('decade:2010')], languages: [entry('language:en')], countries: [entry('country:US')],
  directors: [entry('person:100')], creators: [entry('person:300')], actors: [entry('person:200')], ...overrides,
} })
const movie = (id = 1, overrides = {}) => ({ tmdbId: id, mediaType: 'movie', title: `Movie ${id}`, popularity: 10,
  metadata: { genreIds: [28], releaseYear: 2014, originalLanguage: 'en', countryCodes: ['US'], directors: [{ id: 100, name: 'Director' }], actors: [{ id: 200, name: 'Actor' }] }, ...overrides })
const tv = (id = 2, overrides = {}) => ({ tmdbId: id, mediaType: 'tv', title: `TV ${id}`, popularity: 10,
  metadata: { genreIds: [28], releaseYear: 2014, originalLanguage: 'en', countryCodes: ['US'], creators: [{ id: 300, name: 'Creator' }], actors: [{ id: 200, name: 'Actor' }] }, ...overrides })
const result = (profile, candidates) => rankRecommendations({ dna: profile, candidates })
const only = (overrides = {}) => dna({ genres: [], mediaTypes: [], decades: [], languages: [], countries: [], directors: [], creators: [], actors: [], ...overrides })
function expectCode(run, code) { assert.throws(run, error => error instanceof RecommendationError && error.code === code && !error.message.includes('{')) }

describe('recommendation v1 formula', () => {
  it('has an independent version and applicable weights sum exactly to one', () => {
    assert.equal(RECOMMENDATION_ALGORITHM_VERSION, '1.0.0')
    const common = ['genres', 'mediaTypes', 'decades', 'languages', 'countries', 'actors'].reduce((sum, key) => sum + RECOMMENDATION_DIMENSION_WEIGHTS[key], 0)
    assert.ok(Math.abs(common + RECOMMENDATION_DIMENSION_WEIGHTS.directors - 1) < Number.EPSILON)
    assert.ok(Math.abs(common + RECOMMENDATION_DIMENSION_WEIGHTS.creators - 1) < Number.EPSILON)
  })
  it('scores a complete maximum match at 100 with a full breakdown', () => {
    const ranked = result(dna({ mediaTypes: [entry('media:movie')] }), [movie()]).results[0]
    assert.equal(ranked.score, 100); assert.equal(ranked.metadataCoverage, 1)
    assert.equal(ranked.profileEvidenceCoverage, 1); assert.equal(ranked.hasPersonalizationEvidence, true)
    assert.deepEqual(ranked.breakdown.map(value => value.dimension), ['genres', 'mediaTypes', 'decades', 'languages', 'countries', 'actors', 'directors'])
    assert.ok(ranked.reasons.length >= 1 && ranked.reasons.length <= 3)
  })
  it('uses score multiplied by entry confidence', () => {
    const low = result(only({ genres: [entry('genre:28', 1, 0.2)] }), [movie()]).results[0]
    const high = result(only({ genres: [entry('genre:28', 1, 0.8)] }), [movie()]).results[0]
    assert.equal(low.score, 53); assert.equal(high.score, 62)
  })
  it('applies negative preferences and clamps exact boundaries', () => {
    const dimensions = Object.fromEntries(Object.entries(dna().dimensions).map(([name, entries]) => [name, entries.map(value => ({ ...value, score: -1, confidence: 1 }))]))
    dimensions.mediaTypes = [entry('media:movie', -1, 1)]
    assert.equal(result(dna(dimensions), [movie()]).results[0].score, 0)
    assert.match(result(only({ genres: [entry('genre:28', -1)] }), [movie()]).results[0].reasons[0], /weaker fit/)
  })
  it('caps a dimension and averages known and unknown candidate features', () => {
    const ranked = result(only({ genres: [entry('genre:28')] }), [movie(1, { metadata: { ...movie().metadata, genreIds: [28, 999999] } })]).results[0]
    const genres = ranked.breakdown.find(value => value.dimension === 'genres')
    assert.equal(genres.match, 0.5); assert.equal(genres.contribution, 0.15); assert.equal(ranked.score, 57.5)
  })
  it('handles scalar and people dimensions without cross-role matching', () => {
    const movieRank = result(dna(), [movie()]).results[0]; const tvRank = result(dna(), [tv()]).results[0]
    assert.ok(movieRank.breakdown.some(value => value.dimension === 'directors' && value.contribution > 0)); assert.equal(movieRank.breakdown.some(value => value.dimension === 'creators'), false)
    assert.ok(tvRank.breakdown.some(value => value.dimension === 'creators' && value.contribution > 0)); assert.equal(tvRank.breakdown.some(value => value.dimension === 'directors'), false)
    for (const name of ['decades', 'languages', 'countries', 'actors']) assert.ok(movieRank.breakdown.some(value => value.dimension === name && value.contribution > 0), name)
  })
  it('keeps missing and unknown metadata neutral and reports coverage', () => {
    const partial = result(dna(), [movie(1, { metadata: {} })]).results[0]
    assert.equal(partial.score, 57.5); assert.equal(partial.metadataCoverage, 0.15)
    const unknown = result(only(), [movie(2, { metadata: { genreIds: [999999], releaseYear: 1800, originalLanguage: 'zz', countryCodes: ['ZZ'], directors: [{ id: 999 }], actors: [{ id: 998 }] } })]).results[0]
    assert.equal(unknown.score, 50); assert.deepEqual(unknown.reasons, ['Limited preference evidence for this title.'])
  })
  it('distinguishes an empty profile from the neutral score', () => {
    const ranked = result(only(), [movie()]).results[0]
    assert.equal(ranked.score, 50)
    assert.equal(ranked.metadataCoverage, 1)
    assert.equal(ranked.profileEvidenceCoverage, 0)
    assert.equal(ranked.hasPersonalizationEvidence, false)
  })
  it('keeps complete candidate metadata without DNA overlap at zero evidence', () => {
    const ranked = result(only({ genres: [entry('genre:12')] }), [movie()]).results[0]
    assert.equal(ranked.metadataCoverage, 1)
    assert.equal(ranked.profileEvidenceCoverage, 0)
    assert.equal(ranked.hasPersonalizationEvidence, false)
  })
  it('weights partial multi-value DNA evidence without changing the score formula', () => {
    const ranked = result(only({ genres: [entry('genre:28')] }), [
      movie(1, { metadata: { ...movie().metadata, genreIds: [28, 18] } }),
    ]).results[0]
    assert.equal(ranked.score, 57.5)
    assert.equal(ranked.profileEvidenceCoverage, 0.15)
    assert.equal(ranked.hasPersonalizationEvidence, true)
    assert.equal(ranked.breakdown.find(value => value.dimension === 'genres').profileEvidenceCoverage, 0.5)
  })
  it('reports complete comparable profile evidence independently of affinity sign', () => {
    const positive = result(dna({ mediaTypes: [entry('media:movie')] }), [movie()]).results[0]
    const negative = result(only({ genres: [entry('genre:28', -1)] }), [movie()]).results[0]
    assert.equal(positive.profileEvidenceCoverage, 1)
    assert.equal(negative.profileEvidenceCoverage, 0.3)
    assert.equal(negative.hasPersonalizationEvidence, true)
    assert.equal(negative.score, 35)
  })
})

describe('recommendation validation, ordering and exclusions', () => {
  it('is deterministic across input and metadata order and does not mutate input', () => {
    const candidates = [movie(2, { metadata: { ...movie().metadata, genreIds: [18, 28], countryCodes: ['GB', 'US'] } }), movie(1)]
    const original = structuredClone(candidates); const forward = result(dna(), candidates); const reverse = result(dna(), [...candidates].reverse())
    assert.deepEqual(forward, reverse); assert.deepEqual(candidates, original)
  })
  it('uses score, coverage, popularity and media key as stable tie-breakers', () => {
    const profile = dna({ genres: [], mediaTypes: [], decades: [], languages: [], countries: [], directors: [], creators: [], actors: [] })
    assert.deepEqual(result(profile, [movie(3, { popularity: 1 }), movie(2, { popularity: 2 }), movie(1, { popularity: 2 })]).results.map(value => value.mediaKey), ['movie_1', 'movie_2', 'movie_3'])
  })
  it('returns empty results and rejects malformed or duplicate candidates safely', () => {
    assert.deepEqual(result(dna(), []), { algorithmVersion: '1.0.0', results: [], rejectedCount: 0 })
    const ranked = result(dna(), [null, movie(1), movie(1), movie(2, { metadata: { genreIds: ['28'] } }), movie(3)])
    assert.deepEqual(ranked.results.map(value => value.mediaKey), ['movie_3']); assert.equal(ranked.rejectedCount, 4)
  })
  it('never emits non-finite scores from accepted or malformed candidates', () => {
    const ranked = result(dna(), [
      movie(1),
      movie(2, { popularity: Number.NaN }),
      movie(3, { popularity: Number.POSITIVE_INFINITY }),
    ])
    assert.deepEqual(ranked.results.map(value => value.mediaKey), ['movie_1'])
    assert.equal(ranked.rejectedCount, 2)
    for (const item of ranked.results) {
      assert.equal(Number.isFinite(item.score), true)
      assert.equal(Number.isFinite(item.metadataCoverage), true)
      for (const dimension of item.breakdown) {
        assert.equal(Number.isFinite(dimension.match), true)
        assert.equal(Number.isFinite(dimension.contribution), true)
      }
    }
  })
  it('rejects malformed DNA, input and unsupported versions with safe errors', () => {
    expectCode(() => rankRecommendations({ dna: {}, candidates: [] }), RECOMMENDATION_ERROR_CODES.INVALID_DNA)
    expectCode(() => rankRecommendations({ dna: { ...dna(), algorithmVersion: '2.0.0' }, candidates: [] }), RECOMMENDATION_ERROR_CODES.INVALID_DNA)
    expectCode(() => rankRecommendations({ dna: { ...dna(), schemaVersion: 2 }, candidates: [] }), RECOMMENDATION_ERROR_CODES.INVALID_DNA)
    expectCode(() => rankRecommendations({ dna: dna(), candidates: null }), RECOMMENDATION_ERROR_CODES.INVALID_INPUT)
    expectCode(() => rankRecommendations({ dna: dna(), candidates: [], algorithmVersion: '2.0.0' }), RECOMMENDATION_ERROR_CODES.UNSUPPORTED_VERSION)
  })
  it('does not treat malformed DNA entries as personalization evidence', () => {
    const profile = only({ genres: [
      { key: 'genre:28', score: '1', confidence: 1 },
      { key: 'genre:not-an-id', score: 1, confidence: 1 },
    ] })
    const ranked = result(profile, [movie()]).results[0]
    assert.equal(ranked.score, 50)
    assert.equal(ranked.profileEvidenceCoverage, 0)
    assert.equal(ranked.hasPersonalizationEvidence, false)
  })
  it('excludes rated and hidden identities by normalized movie/TV media key', () => {
    const filtered = excludeKnownMedia([movie(1), tv(1), movie(2)], { rated: [{ mediaType: 'movie', tmdbId: 1 }], hidden: ['tv_1'] })
    assert.deepEqual(filtered.map(value => recommendationMediaKey(value.mediaType, value.tmdbId)), ['movie_2']); assert.equal(recommendationMediaKey('person', 1), null)
  })
  it('contains no Firebase, TMDB, network, clock, random or storage dependency', async () => {
    const source = await readFile(new URL('../../functions/src/recommendations/core/rankRecommendations.js', import.meta.url), 'utf8')
    assert.doesNotMatch(source, /from ['"][^'"]*(firebase|firestore)|\bfetch\s*\(|\bDate\s*\(|Math\.random|localStorage|sessionStorage/i)
  })
})
