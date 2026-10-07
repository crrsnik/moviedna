import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  buildPublicDnaPreview,
} from '../src/profilePreview/publicProfilePreview.js'

function taste(
  key,
  strength,
) {
  return {
    key,
    strength,
    confidence: 0.85,
    positiveEvidenceWeight: 3,
    evidenceCount: 4,
  }
}

describe('public profile Taste Title', () => {
  it(
    'projects only the safe derived title id',
    () => {
      const result = buildPublicDnaPreview({
        dimensions: {
          genres: [],
          tasteTags: [
            taste(
              'taste:psychological-thriller',
              0.91,
            ),
            taste(
              'taste:philosophical-sci-fi',
              0.82,
            ),
          ],
        },
      })

      assert.deepEqual(
        result.tasteTitle,
        {
          id: 'mindArchitect',
        },
      )

      assert.equal(
        JSON.stringify(result)
          .includes('confidence'),
        false,
      )

      assert.equal(
        JSON.stringify(result)
          .includes('evidenceCount'),
        false,
      )

      assert.equal(
        JSON.stringify(result)
          .includes('strength'),
        false,
      )
    },
  )

  it(
    'omits the field when evidence is insufficient',
    () => {
      const result = buildPublicDnaPreview({
        dimensions: {
          genres: [],
          tasteTags: [
            {
              ...taste(
                'taste:emotional-drama',
                0.4,
              ),
            },
          ],
        },
      })

      assert.equal(
        'tasteTitle' in result,
        false,
      )
    },
  )
})
