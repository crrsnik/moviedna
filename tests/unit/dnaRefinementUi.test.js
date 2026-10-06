import {
  readFile,
} from 'node:fs/promises'

import assert from 'node:assert/strict'

import {
  describe,
  it,
} from 'node:test'


describe('DNA refinement UI contract', () => {
  it('exposes refinement from My DNA only while refinement is incomplete', async () => {
    const page = await readFile(
      new URL(
        '../../src/pages/DnaPage.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      page,
      /\/profile\/dna\/refine/,
    )

    assert.match(
      page,
      /dnaUi\.refinement\.action/,
    )

    assert.match(
      page,
      /!refinement\.isComplete/,
    )

    assert.match(
      page,
      /useDnaRefinementProgress/,
    )
  })

  it('routes refinement behind the completed onboarding guard', async () => {
    const router = await readFile(
      new URL(
        '../../src/app/router.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    const completedGuard = router.indexOf(
      'element: <OnboardingRoute requireCompleted />',
    )

    const refinementRoute = router.indexOf(
      "path: 'dna/refine'",
    )

    assert.ok(completedGuard >= 0)
    assert.ok(refinementRoute > completedGuard)
  })

  it('keeps refinement optional and capped at 40 answers', async () => {
    const constants = await readFile(
      new URL(
        '../../src/features/dna/constants/dnaRefinement.js',
        import.meta.url,
      ),
      'utf8',
    )

    const experience = await readFile(
      new URL(
        '../../src/features/dna/components/DnaRefinementExperience.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      constants,
      /MAX_DNA_REFINEMENT_RESPONSES = 40/,
    )

    assert.match(
      experience,
      /continueLater/,
    )
  })
})
