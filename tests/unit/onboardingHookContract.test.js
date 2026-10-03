import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  describe,
  it,
} from 'node:test'

const source = await readFile(
  new URL(
    '../../src/features/onboarding/hooks/useOnboarding.js',
    import.meta.url,
  ),
  'utf8',
)

describe('Onboarding hook catalogue contract', () => {
  it('does not depend on the live Trending catalogue', () => {
    assert.doesNotMatch(
      source,
      /getTrendingMovies/,
    )

    assert.doesNotMatch(
      source,
      /catalogService\.js/,
    )
  })

  it('uses the curated onboarding catalogue', () => {
    assert.match(
      source,
      /loadCuratedOnboardingCatalog/,
    )

    const responses = source.indexOf(
      'await loadOnboardingResponses',
    )
    const catalogue = source.indexOf(
      'await loadCuratedOnboardingCatalog',
    )

    assert.ok(responses >= 0)
    assert.ok(catalogue > responses)
  })

  it('localizes TMDB onboarding data from the active locale', () => {
    assert.match(
      source,
      /useTranslation/,
    )

    assert.match(
      source,
      /toTmdbLanguage\(locale\)/,
    )

    assert.match(
      source,
      /language:\s*tmdbLanguage/,
    )

    assert.match(
      source,
      /\[\s*uid,\s*hasCompletedOnboarding,\s*attempt,\s*tmdbLanguage,\s*\]/,
    )
  })

  it('passes saved responses into curated selection and deck preparation', () => {
    assert.match(
      source,
      /loadCuratedOnboardingCatalog\(\{\s*responses,/,
    )

    assert.match(
      source,
      /prepareOnboardingDeck\(\s*movies,\s*responses,\s*\)/,
    )
  })
})
