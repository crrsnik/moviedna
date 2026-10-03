import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  describe,
  it,
} from 'node:test'

describe('Deferred onboarding CTA in My DNA', () => {
  it('shows the onboarding link only for incomplete onboarding', async () => {
    const prompt = await readFile(
      new URL(
        '../../src/features/dna/components/DnaOnboardingPrompt.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      prompt,
      /hasCompletedOnboarding/,
    )

    assert.match(
      prompt,
      /if \(hasCompletedOnboarding\)/,
    )

    assert.match(
      prompt,
      /to="\/onboarding"/,
    )

    assert.match(
      prompt,
      /profile\.dnaTestAction/,
    )
  })

  it('keeps the CTA available in the DNA empty/state view', async () => {
    const state = await readFile(
      new URL(
        '../../src/features/dna/components/DnaStatePanel.jsx',
        import.meta.url,
      ),
      'utf8',
    )

    assert.match(
      state,
      /DnaOnboardingPrompt/,
    )
  })
})
