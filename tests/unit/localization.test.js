import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  LANGUAGE_STORAGE_KEY,
} from '../../src/features/localization/constants/locales.js'

import {
  persistLocale,
  readInitialLocale,
  resolveLocale,
  translate,
} from '../../src/features/localization/core/localization.js'

describe('localization foundation', () => {
  it('prefers a supported stored locale', () => {
    assert.equal(
      resolveLocale({
        storedLocale: 'ru',
        browserLocales: ['fr-CH'],
      }),
      'ru',
    )
  })

  it('normalizes supported browser locales', () => {
    assert.equal(
      resolveLocale({
        browserLocales: [
          'de-CH',
          'fr-CH',
        ],
      }),
      'fr',
    )

    assert.equal(
      resolveLocale({
        browserLocales: ['ru-RU'],
      }),
      'ru',
    )
  })

  it('falls back to English', () => {
    assert.equal(
      resolveLocale({
        storedLocale: 'de',
        browserLocales: ['it-CH'],
      }),
      'en',
    )
  })

  it('reads storage safely before browser preference', () => {
    const storage = {
      getItem(key) {
        assert.equal(
          key,
          LANGUAGE_STORAGE_KEY,
        )

        return 'fr'
      },
    }

    assert.equal(
      readInitialLocale({
        storage,
        navigatorObject: {
          languages: ['ru-RU'],
        },
      }),
      'fr',
    )
  })

  it('survives inaccessible storage', () => {
    const storage = {
      getItem() {
        throw new Error('blocked')
      },
    }

    assert.equal(
      readInitialLocale({
        storage,
        navigatorObject: {
          language: 'ru-RU',
        },
      }),
      'ru',
    )
  })

  it('persists only supported locales', () => {
    const writes = []

    persistLocale(
      'fr',
      {
        setItem(...args) {
          writes.push(args)
        },
      },
    )

    assert.deepEqual(writes, [
      [LANGUAGE_STORAGE_KEY, 'fr'],
    ])

    assert.throws(
      () => persistLocale('de', null),
      TypeError,
    )
  })

  it('translates all supported languages', () => {
    assert.equal(
      translate('en', 'language.label'),
      'Language',
    )

    assert.equal(
      translate('fr', 'language.label'),
      'Langue',
    )

    assert.equal(
      translate('ru', 'language.label'),
      'Язык',
    )
  })

  it('falls back safely for unknown locale and key', () => {
    assert.equal(
      translate('de', 'common.cancel'),
      'Cancel',
    )

    assert.equal(
      translate('fr', 'missing.key'),
      'missing.key',
    )
  })
})
