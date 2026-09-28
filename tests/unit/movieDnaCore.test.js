import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { calculateMovieDna } from '../../functions/src/dna/core/calculateMovieDna.js'
import {
  FAVORITE_WEIGHT,
  MOVIEDNA_ALGORITHM_VERSION,
  ONBOARDING_WEIGHTS,
  RATING_WEIGHTS,
} from '../../functions/src/dna/core/movieDnaConstants.js'
import { MOVIEDNA_ERROR_CODES, MovieDnaError } from '../../functions/src/dna/core/movieDnaErrors.js'

const complete = Object.freeze({
  genres: true,
  releaseYear: true,
  originalLanguage: true,
  countries: true,
  people: true,
})

function metadata(overrides = {}) {
  return {
    status: 'ready',
    genres: [{ id: 28, label: 'Action' }],
    releaseYear: 2014,
    originalLanguage: { code: 'en', label: 'English' },
    countries: [{ code: 'US', label: 'United States' }],
    directors: [{ id: 100, name: 'Director' }],
    creators: [],
    actors: [
      { id: 201, name: 'Actor One', billingOrder: 0 },
      { id: 202, name: 'Actor Two', billingOrder: 1 },
    ],
    completeness: { ...complete },
    ...overrides,
  }
}

function item(id, overrides = {}) {
  const mediaType = overrides.mediaType ?? 'movie'
  const { metadata: metadataOverrides, ...itemOverrides } = overrides
  return {
    mediaKey: `${mediaType}_${id}`,
    tmdbId: id,
    mediaType,
    rating: 8,
    onboardingReaction: null,
    favorite: false,
    metadata: metadataOverrides === null
      ? null
      : mediaType === 'movie'
        ? metadata(metadataOverrides)
        : metadata({ directors: [], creators: [{ id: 300, name: 'Creator' }], ...metadataOverrides }),
    ...itemOverrides,
  }
}

async function result(items, extra = {}) {
  return calculateMovieDna({ items, ...extra })
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error instanceof MovieDnaError, true)
    assert.equal(error.code, code)
    assert.equal(error.message.includes('{'), false)
    return true
  })
}

describe('MovieDNA v1 signal weights and priority', () => {
  const expectedWeights = [-1, -0.75, -0.5, -0.25, 0, 0.2, 0.4, 0.6, 0.8, 1]
  for (let rating = 1; rating <= 10; rating += 1) {
    it(`uses the exact v1 weight for rating ${rating}`, async () => {
      const dna = await result([item(rating, { rating })])
      assert.equal(RATING_WEIGHTS[rating], expectedWeights[rating - 1])
      assert.equal(dna.dimensions.mediaTypes[0]?.signedContribution ?? 0, expectedWeights[rating - 1])
    })
  }

  for (const [reaction, weight] of Object.entries(ONBOARDING_WEIGHTS)) {
    it(`uses onboarding ${reaction} weight`, async () => {
      const dna = await result([item(20, { rating: null, onboardingReaction: reaction })])
      assert.equal(dna.dimensions.mediaTypes[0]?.signedContribution ?? 0, weight)
    })
  }

  it('uses Favorite only as a fallback', async () => {
    const dna = await result([item(21, { rating: null, favorite: true })])
    assert.equal(dna.dimensions.mediaTypes[0].signedContribution, FAVORITE_WEIGHT)
    assert.equal(dna.sourceCounts.favoriteUsed, 1)
  })

  it('rating suppresses onboarding and Favorite', async () => {
    const dna = await result([item(22, { rating: 2, onboardingReaction: 'like', favorite: true })])
    assert.equal(dna.dimensions.mediaTypes[0].signedContribution, -0.75)
    assert.equal(dna.sourceCounts.ratingUsed, 1)
    assert.equal(dna.sourceCounts.shadowedByHigherPriority, 2)
  })

  it('rating 5 suppresses lower signals while remaining neutral', async () => {
    const dna = await result([item(23, { rating: 5, onboardingReaction: 'like', favorite: true })])
    assert.deepEqual(dna.dimensions.mediaTypes, [])
    assert.equal(dna.sourceCounts.neutralOrSkipped, 1)
    assert.equal(dna.sourceCounts.uniqueNonZeroUsed, 0)
    assert.equal(dna.sourceCounts.shadowedByHigherPriority, 2)
  })

  it('onboarding like/dislike suppresses Favorite', async () => {
    const dna = await result([item(24, { rating: null, onboardingReaction: 'dislike', favorite: true })])
    assert.equal(dna.dimensions.mediaTypes[0].signedContribution, -0.35)
    assert.equal(dna.sourceCounts.onboardingUsed, 1)
    assert.equal(dna.sourceCounts.shadowedByHigherPriority, 1)
  })

  it('skip does not block a later Favorite', async () => {
    const dna = await result([item(25, { rating: null, onboardingReaction: 'skip', favorite: true })])
    assert.equal(dna.dimensions.mediaTypes[0].signedContribution, 0.2)
    assert.equal(dna.sourceCounts.favoriteUsed, 1)
  })

  it('counts a canonical item only once', async () => {
    const dna = await result([item(26, { rating: 10, onboardingReaction: 'dislike', favorite: true })])
    assert.equal(dna.sourceCounts.uniqueNonZeroUsed, 1)
    assert.equal(dna.dimensions.mediaTypes[0].signedContribution, 1)
  })
})

describe('MovieDNA dimensions, evidence and normalization', () => {
  it('calculates every v1 dimension for movies and TV', async () => {
    const dna = await result([
      item(30, { rating: 10 }),
      item(31, { mediaType: 'tv', rating: 10 }),
    ])
    for (const name of ['genres', 'mediaTypes', 'decades', 'languages', 'countries', 'directors', 'creators']) {
      assert.ok(dna.dimensions[name].length > 0, name)
    }
    assert.equal(dna.dimensions.actors.length, 2)
  })

  it('splits one signal across values in a dimension', async () => {
    const dna = await result([item(32, {
      rating: 10,
      metadata: { genres: [{ id: 28, label: 'Action' }, { id: 18, label: 'Drama' }] },
    })])
    assert.deepEqual(dna.dimensions.genres.map((entry) => entry.signedContribution), [0.5, 0.5])
    assert.deepEqual(dna.dimensions.genres.map((entry) => entry.score), [0.5, 0.5])
  })

  it('removes duplicate metadata values before distributing weight', async () => {
    const dna = await result([item(33, {
      rating: 10,
      metadata: { genres: [{ id: 28, label: 'Action' }, { id: 28, label: 'Action' }] },
    })])
    assert.equal(dna.dimensions.genres.length, 1)
    assert.equal(dna.dimensions.genres[0].signedContribution, 1)
  })

  it('uses decades derived from release year', async () => {
    const dna = await result([item(34, { metadata: { releaseYear: 1999 } })])
    assert.equal(dna.dimensions.decades[0].key, 'decade:1990')
  })

  it('keeps original language and country identities', async () => {
    const dna = await result([item(35, {
      metadata: {
        originalLanguage: { code: 'fr', label: 'French' },
        countries: [{ code: 'FR', label: 'France' }],
      },
    })])
    assert.equal(dna.dimensions.languages[0].key, 'language:fr')
    assert.equal(dna.dimensions.countries[0].key, 'country:FR')
  })

  it('applies directors only to movies and creators only to TV', async () => {
    const dna = await result([
      item(36, { rating: 10 }),
      item(37, { mediaType: 'tv', rating: 10 }),
    ])
    assert.equal(dna.dimensions.directors[0].key, 'person:100')
    assert.equal(dna.dimensions.creators[0].key, 'person:300')
  })

  it('requires actor evidence from two different media', async () => {
    const one = await result([item(38, { rating: 10 })])
    const two = await result([item(38, { rating: 10 }), item(39, { rating: 10 })])
    assert.deepEqual(one.dimensions.actors, [])
    assert.equal(two.dimensions.actors[0].evidenceCount, 2)
  })

  it('uses at most three top-billed actors', async () => {
    const actors = Array.from({ length: 5 }, (_, index) => ({
      id: 500 + index,
      name: `Actor ${index}`,
      billingOrder: 4 - index,
    }))
    const dna = await result([
      item(40, { metadata: { actors } }),
      item(41, { metadata: { actors } }),
    ])
    assert.deepEqual(dna.dimensions.actors.map((entry) => entry.key), ['person:502', 'person:503', 'person:504'])
  })

  it('preserves conflict direction and absolute evidence', async () => {
    const dna = await result([
      item(42, { rating: 10 }),
      item(43, { rating: 1 }),
      item(44, { rating: 8 }),
    ])
    const action = dna.dimensions.genres[0]
    assert.equal(action.signedContribution, 0.6)
    assert.equal(action.absoluteEvidenceWeight, 2.6)
    assert.equal(action.evidenceCount, 3)
    assert.equal(action.score, 0.230769)
  })

  it('retains negative affinities', async () => {
    const dna = await result([item(45, { rating: 1 })])
    assert.equal(dna.dimensions.genres[0].score, -1)
    assert.equal(dna.dimensions.genres[0].signedContribution, -1)
  })

  it('keeps one-item per-value confidence low', async () => {
    const dna = await result([item(46, { rating: 10 })])
    assert.ok(dna.dimensions.genres[0].confidence < 0.2)
    assert.ok(dna.overallConfidence < 0.25)
  })

  it('sorts score, evidence count and stable key deterministically', async () => {
    const dna = await result([
      item(47, { rating: 8, metadata: { genres: [{ id: 28, label: 'Action' }] } }),
      item(48, { rating: 8, metadata: { genres: [{ id: 18, label: 'Drama' }] } }),
      item(49, { rating: 8, metadata: { genres: [{ id: 18, label: 'Drama' }] } }),
    ])
    assert.deepEqual(dna.dimensions.genres.map((entry) => entry.key), ['genre:18', 'genre:28'])
  })

  it('rounds all calculated decimals centrally to six places', async () => {
    const dna = await result([item(50, {
      rating: 10,
      metadata: { genres: [1, 2, 3].map((id) => ({ id, label: `G${id}` })) },
    })])
    assert.equal(dna.dimensions.genres[0].signedContribution, 0.333333)
    assert.equal(dna.dimensions.genres[0].score, 0.333333)
  })
})

describe('MovieDNA coverage and confidence', () => {
  it('returns zero coverage and confidence for empty input', async () => {
    const dna = await result([])
    assert.equal(dna.metadataCoverage, 0)
    assert.equal(dna.overallConfidence, 0)
    assert.ok(Object.values(dna.dimensions).every((entries) => entries.length === 0))
  })

  it('counts known empty applicable metadata as covered', async () => {
    const dna = await result([item(60, {
      metadata: { genres: [], countries: [], directors: [], actors: [], completeness: { ...complete } },
    })])
    assert.equal(dna.metadataCoverage, 1)
  })

  it('does not require movie creators or TV directors for coverage', async () => {
    const movie = await result([item(61)])
    const tv = await result([item(62, { mediaType: 'tv' })])
    assert.equal(movie.metadataCoverage, 1)
    assert.equal(tv.metadataCoverage, 1)
  })

  it('distinguishes unavailable metadata from complete metadata', async () => {
    const unavailable = await result([item(63, { metadata: null })])
    const available = await result([item(63)])
    assert.equal(unavailable.metadataCoverage, 0)
    assert.equal(unavailable.sourceCounts.unavailableMetadata, 1)
    assert.equal(available.metadataCoverage, 1)
    assert.equal(available.sourceCounts.enrichedUsed, 1)
  })

  it('computes partial coverage from explicit completeness', async () => {
    const dna = await result([item(64, {
      metadata: { completeness: { genres: true, releaseYear: true, originalLanguage: false, countries: false, people: false } },
    })])
    assert.equal(dna.metadataCoverage, 0.333333)
  })

  it('usually raises confidence with independent evidence', async () => {
    const one = await result([item(65)])
    const many = await result(Array.from({ length: 10 }, (_, index) => item(70 + index, {
      metadata: { genres: [{ id: 1 + index, label: `Genre ${index}` }] },
    })))
    assert.ok(many.overallConfidence > one.overallConfidence)
  })

  it('low metadata coverage lowers overall confidence', async () => {
    const full = await result([item(80), item(81)])
    const missing = await result([item(80, { metadata: null }), item(81, { metadata: null })])
    assert.ok(full.overallConfidence > missing.overallConfidence)
  })

  it('neutral ratings affect statistics but not affinity or confidence', async () => {
    const dna = await result([item(82, { rating: 5 })])
    assert.equal(dna.sourceCounts.ratingsRead, 1)
    assert.equal(dna.sourceCounts.neutralOrSkipped, 1)
    assert.equal(dna.overallConfidence, 0)
  })
})

describe('MovieDNA determinism and fingerprint', () => {
  it('is invariant to item and metadata array order', async () => {
    const first = item(90, {
      metadata: {
        genres: [{ id: 28, label: 'Action' }, { id: 18, label: 'Drama' }],
        countries: [{ code: 'US', label: 'US' }, { code: 'CA', label: 'Canada' }],
      },
    })
    const second = item(91)
    const reversedFirst = structuredClone(first)
    reversedFirst.metadata.genres.reverse()
    reversedFirst.metadata.countries.reverse()
    assert.deepEqual(await result([first, second]), await result([second, reversedFirst]))
  })

  it('does not mutate its input', async () => {
    const input = { items: [item(92)] }
    const before = structuredClone(input)
    await calculateMovieDna(input)
    assert.deepEqual(input, before)
  })

  it('produces a stable SHA-256 fingerprint', async () => {
    const a = await result([item(93), item(94)])
    const b = await result([item(94), item(93)])
    assert.equal(a.inputFingerprint, b.inputFingerprint)
    assert.match(a.inputFingerprint, /^sha256:[a-f0-9]{64}$/)
  })

  it('does not change fingerprint for display labels', async () => {
    const a = await result([item(95)])
    const b = await result([item(95, { metadata: { genres: [{ id: 28, label: 'Localized Action' }] } })])
    assert.equal(a.inputFingerprint, b.inputFingerprint)
  })

  for (const [name, change] of [
    ['rating', { rating: 9 }],
    ['reaction', { rating: null, onboardingReaction: 'like' }],
    ['Favorite', { rating: null, favorite: true }],
    ['metadata', { metadata: { releaseYear: 1990 } }],
  ]) {
    it(`changes fingerprint when ${name} changes`, async () => {
      const a = await result([item(96)])
      const b = await result([item(96, change)])
      assert.notEqual(a.inputFingerprint, b.inputFingerprint)
    })
  }

  it('returns only JSON-serializable plain data', async () => {
    const dna = await result([item(97), item(98)])
    const serialized = JSON.stringify(dna)
    assert.deepEqual(JSON.parse(serialized), dna)
    assert.equal(serialized.includes('undefined'), false)
  })

  it('returns the single supported algorithm version', async () => {
    const dna = await result([], { algorithmVersion: MOVIEDNA_ALGORITHM_VERSION })
    assert.equal(dna.algorithmVersion, '1.0.0')
  })
})

describe('MovieDNA safe validation errors', () => {
  it('rejects a duplicate canonical media item', async () => {
    await expectCode(result([item(100), item(100)]), MOVIEDNA_ERROR_CODES.DUPLICATE_SOURCE_ENTRY)
  })

  for (const invalid of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    it(`rejects invalid TMDB ID ${String(invalid)}`, async () => {
      await expectCode(result([{ ...item(101), tmdbId: invalid }]), MOVIEDNA_ERROR_CODES.INVALID_INPUT)
    })
  }

  it('rejects media identity mismatch', async () => {
    await expectCode(result([{ ...item(102), mediaKey: 'tv_102' }]), MOVIEDNA_ERROR_CODES.MEDIA_IDENTITY_MISMATCH)
  })

  it('rejects an unknown media type', async () => {
    await expectCode(result([{ ...item(103), mediaType: 'person' }]), MOVIEDNA_ERROR_CODES.INVALID_INPUT)
  })

  for (const rating of [0, 11, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '8']) {
    it(`rejects invalid rating ${String(rating)}`, async () => {
      await expectCode(result([item(104, { rating })]), MOVIEDNA_ERROR_CODES.INVALID_RATING)
    })
  }

  it('rejects an unknown reaction', async () => {
    await expectCode(result([item(105, { rating: null, onboardingReaction: 'love' })]), MOVIEDNA_ERROR_CODES.INVALID_REACTION)
  })

  for (const metadataChange of [
    { releaseYear: Number.NaN },
    { originalLanguage: { code: 'EN', label: 'English' } },
    { countries: [{ code: 'USA', label: 'US' }] },
    { actors: [{ id: 1, name: 'Actor', billingOrder: Number.POSITIVE_INFINITY }] },
    { completeness: { genres: true } },
  ]) {
    it('rejects malformed metadata without exposing it', async () => {
      await expectCode(result([item(106, { metadata: metadataChange })]), MOVIEDNA_ERROR_CODES.INVALID_METADATA)
    })
  }

  it('rejects the wrong role for a media type', async () => {
    await expectCode(result([item(107, { metadata: { creators: [{ id: 1, name: 'Creator' }] } })]), MOVIEDNA_ERROR_CODES.INVALID_METADATA)
  })

  it('rejects unsupported algorithm versions', async () => {
    await expectCode(result([], { algorithmVersion: '2.0.0' }), MOVIEDNA_ERROR_CODES.UNSUPPORTED_ALGORITHM_VERSION)
  })

  it('rejects malformed top-level input', async () => {
    await expectCode(calculateMovieDna({}), MOVIEDNA_ERROR_CODES.INVALID_INPUT)
  })
})

describe('MovieDNA documented numeric examples', () => {
  it('calculates onboarding-only genre evidence', async () => {
    const entries = [
      ...Array.from({ length: 3 }, (_, index) => item(200 + index, { rating: null, onboardingReaction: 'like' })),
      item(203, { rating: null, onboardingReaction: 'like', metadata: { genres: [{ id: 35, label: 'Comedy' }] } }),
      ...Array.from({ length: 2 }, (_, index) => item(204 + index, {
        rating: null,
        onboardingReaction: 'dislike',
        metadata: { genres: [{ id: 18, label: 'Drama' }] },
      })),
      ...Array.from({ length: 4 }, (_, index) => item(206 + index, { rating: null, onboardingReaction: 'skip' })),
    ]
    const dna = await result(entries)
    assert.deepEqual(dna.dimensions.genres.map(({ key, score }) => ({ key, score })), [
      { key: 'genre:28', score: 0.5 },
      { key: 'genre:35', score: 0.166667 },
      { key: 'genre:18', score: -0.333333 },
    ])
    assert.equal(dna.overallConfidence, 0.42375)
  })

  it('calculates mixed source priority with v1 rating weights', async () => {
    const entries = [
      item(220, { rating: 9, onboardingReaction: 'like' }),
      item(221, { rating: 8, metadata: { genres: [{ id: 878, label: 'Science Fiction' }] } }),
      item(222, { rating: 3, metadata: { genres: [{ id: 18, label: 'Drama' }] } }),
      item(223, { rating: null, favorite: true, metadata: { genres: [{ id: 35, label: 'Comedy' }] } }),
    ]
    const dna = await result(entries)
    assert.deepEqual(dna.dimensions.genres.map(({ key, signedContribution }) => ({ key, signedContribution })), [
      { key: 'genre:28', signedContribution: 0.8 },
      { key: 'genre:878', signedContribution: 0.6 },
      { key: 'genre:35', signedContribution: 0.2 },
      { key: 'genre:18', signedContribution: -0.5 },
    ])
    assert.equal(dna.sourceCounts.uniqueNonZeroUsed, 4)
  })

  it('calculates contradictory Horror evidence transparently', async () => {
    const ratings = [10, 8, 2, 3].map((rating, index) => item(230 + index, { rating }))
    const onboarding = [234, 235].map((id) => item(id, { rating: null, onboardingReaction: 'like' }))
    const dna = await result([...ratings, ...onboarding])
    const horror = dna.dimensions.genres[0]
    assert.equal(horror.signedContribution, 1.05)
    assert.equal(horror.absoluteEvidenceWeight, 3.55)
    assert.equal(horror.score, 0.295775)
    assert.equal(horror.evidenceCount, 6)
  })
})
