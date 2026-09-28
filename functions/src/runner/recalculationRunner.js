import { randomUUID } from 'node:crypto'

import { calculateMovieDna } from '../dna/core/calculateMovieDna.js'
import { collectDnaSources } from '../sources/collectSources.js'
import { safeErrorCode, MovieDnaServerError, SERVER_ERROR_CODES } from '../errors.js'

function isValidUid(uid) {
  return typeof uid === 'string' && uid.length >= 1 && uid.length <= 128
    && !uid.includes('/')
    && [...uid].every((character) => character.codePointAt(0) >= 32)
}

export function createRecalculationRunner({
  store,
  metadataResolver,
  tokenFactory = randomUUID,
  calculate = calculateMovieDna,
}) {
  return async function recalculate(uid, options = {}) {
    if (!isValidUid(uid)) {
      throw new MovieDnaServerError(SERVER_ERROR_CODES.INVALID_PROFILE)
    }
    const runToken = tokenFactory()
    await store.beginRun(uid, runToken, options)
    try {
      const before = await store.loadSources(uid)
      const items = collectDnaSources(before.snapshot)
      const enriched = await metadataResolver.resolve(items)
      const calculation = await calculate({ items: enriched })
      const after = await store.loadSources(uid)
      if (before.revision !== after.revision) {
        throw new MovieDnaServerError(SERVER_ERROR_CODES.STALE_SOURCE)
      }
      const unchanged = await store.finishRun(uid, runToken, calculation)
      return {
        status: unchanged ? 'unchanged' : 'updated',
        algorithmVersion: calculation.algorithmVersion,
        inputFingerprint: calculation.inputFingerprint,
      }
    } catch (error) {
      await store.failRun(uid, runToken, safeErrorCode(error))
      throw error
    }
  }
}
