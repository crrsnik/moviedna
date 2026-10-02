import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  TMDB_DEFAULT_LANGUAGE,
  isTmdbLanguage,
  toTmdbLanguage,
} from '../../src/shared/config/tmdb.js'

describe('TMDB localization contract', () => {
  it('maps supported MovieDNA locales to TMDB languages', () => {
    assert.equal(toTmdbLanguage('en'), 'en-US')
    assert.equal(toTmdbLanguage('fr'), 'fr-FR')
    assert.equal(toTmdbLanguage('ru'), 'ru-RU')
  })

  it('falls back safely to English for unknown app locales', () => {
    assert.equal(toTmdbLanguage('de'), TMDB_DEFAULT_LANGUAGE)
    assert.equal(toTmdbLanguage(undefined), TMDB_DEFAULT_LANGUAGE)
  })

  it('allows only supported TMDB languages', () => {
    for (const language of [
      'en-US',
      'fr-FR',
      'ru-RU',
    ]) {
      assert.equal(isTmdbLanguage(language), true)
    }

    for (const language of [
      'de-DE',
      'en',
      '',
      null,
      undefined,
    ]) {
      assert.equal(isTmdbLanguage(language), false)
    }
  })
})
