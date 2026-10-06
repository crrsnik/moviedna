import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'


describe('recommendation hide contract', () => {
  it('renders an accessible hide action on every recommendation card', async () => {
    const source = await readFile(
      new URL(
        '../../src/features/recommendations/components/RecommendationCard.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /recommendationCard\.hide/,
    )

    assert.match(
      source,
      /onHide\?\.\(recommendation\)/,
    )
  })

  it('accepts canonical movie and TV recommendation keys', async () => {
    const service = await readFile(
      new URL(
        '../../src/features/recommendations/services/recommendationHiddenService.js',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      service,
      /\/\^\(movie\|tv\)_\(\[1-9\]\\d\{0,11\}\)\$\//,
    )
  })

  it('persists hidden recommendations separately from MovieDNA signals', async () => {
    const service = await readFile(
      new URL(
        '../../src/features/recommendations/services/recommendationHiddenService.js',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      service,
      /hiddenRecommendations/,
    )

    assert.doesNotMatch(
      service,
      /ratings|movieDna|dnaRefinementResponses/,
    )
  })

  it('passes persisted hidden titles into backend exclusion', async () => {
    const adapter = await readFile(
      new URL(
        '../../functions/src/adapters/firestoreAdapter.js',
        import.meta.url,
      ),
      'utf8',
    )

    const handler = await readFile(
      new URL(
        '../../functions/src/recommendations/createRecommendationHandler.js',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      adapter,
      /collection\('hiddenRecommendations'\)/,
    )

    assert.match(
      handler,
      /hidden:\s*Array\.isArray\(context\.hidden\)/,
    )
  })

  it('keeps the recognizable-title quota at twelve of twenty', async () => {
    const source = await readFile(
      new URL(
        '../../functions/src/recommendations/core/rankRecommendations.js',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      source,
      /RECOMMENDATION_HEAD_SIZE\s*=\s*20/,
    )

    assert.match(
      source,
      /RECOMMENDATION_FAMILIAR_HEAD_QUOTA\s*=\s*12/,
    )
  })
})
