const DIMENSIONS = ['genres', 'mediaTypes', 'decades', 'languages', 'countries', 'directors', 'creators', 'actors']
const COUNT_FIELDS = ['ratingsRead', 'onboardingRead', 'favoritesRead', 'uniqueNonZeroUsed', 'ratingUsed', 'onboardingUsed', 'favoriteUsed', 'neutralOrSkipped', 'shadowedByHigherPriority', 'discardedSourceCount', 'enrichedUsed', 'unavailableMetadata']

export class MovieDnaDocumentError extends Error {
  constructor(code) { super('MovieDNA data is unavailable.'); this.name = 'MovieDnaDocumentError'; this.code = code }
}

function plain(value) { return value && typeof value === 'object' && !Array.isArray(value) }
function finiteRange(value, min, max) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max }
function timestamp(value, optional = false) {
  if (value == null && optional) return null
  const date = value?.toDate instanceof Function ? value.toDate() : value instanceof Date ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) throw new MovieDnaDocumentError('malformed')
  return date.toISOString()
}
function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new MovieDnaDocumentError('malformed')
  return value
}
function normalizeEntry(value, dimension) {
  if (!plain(value) || typeof value.key !== 'string' || !value.key || typeof value.label !== 'string' || !value.label.trim()
    || !finiteRange(value.score, -1, 1) || !finiteRange(value.confidence, 0, 1)
    || !Number.isSafeInteger(value.evidenceCount) || value.evidenceCount < 1
    || typeof value.signedContribution !== 'number' || !Number.isFinite(value.signedContribution)
    || typeof value.absoluteEvidenceWeight !== 'number' || !Number.isFinite(value.absoluteEvidenceWeight) || value.absoluteEvidenceWeight < 0) {
    throw new MovieDnaDocumentError('malformed')
  }
  return Object.freeze({
    key: value.key, label: resolveDimensionLabel(dimension, value), score: value.score, confidence: value.confidence,
    evidenceCount: value.evidenceCount, signedContribution: value.signedContribution,
    absoluteEvidenceWeight: value.absoluteEvidenceWeight,
  })
}
function normalizeDimensions(value) {
  if (!plain(value)) throw new MovieDnaDocumentError('malformed')
  const result = {}
  for (const name of DIMENSIONS) {
    const entries = value[name] ?? []
    if (!Array.isArray(entries)) throw new MovieDnaDocumentError('malformed')
    result[name] = Object.freeze(entries.map((entry) => normalizeEntry(entry, name)).sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.label.localeCompare(b.label)))
  }
  return Object.freeze(result)
}

export function normalizeMovieDnaCurrent(snapshot) {
  if (!snapshot?.exists?.()) return null
  const value = snapshot.data()
  if (!plain(value)) throw new MovieDnaDocumentError('malformed')
  if (value.algorithmVersion !== '1.0.0') throw new MovieDnaDocumentError('unsupported-version')
  if (value.schemaVersion !== 1 || !['ready', 'insufficient-data'].includes(value.status)
    || !finiteRange(value.confidence, 0, 1) || !finiteRange(value.metadataCoverage, 0, 1)
    || !plain(value.sourceCounts)) throw new MovieDnaDocumentError('malformed')
  const sourceCounts = Object.fromEntries(COUNT_FIELDS.map((field) => [field, count(value.sourceCounts[field] ?? 0)]))
  return Object.freeze({
    status: value.status, algorithmVersion: value.algorithmVersion,
    confidence: value.confidence, metadataCoverage: value.metadataCoverage,
    sourceCounts: Object.freeze(sourceCounts), dimensions: normalizeDimensions(value.dimensions),
    calculatedAt: timestamp(value.calculatedAt), updatedAt: timestamp(value.updatedAt),
  })
}

export function normalizeMovieDnaRecalculation(snapshot) {
  if (!snapshot?.exists?.()) return null
  const value = snapshot.data()
  if (!plain(value) || value.schemaVersion !== 1 || !['queued', 'running', 'succeeded', 'failed'].includes(value.status)
    || (value.algorithmVersion != null && value.algorithmVersion !== '1.0.0')) throw new MovieDnaDocumentError(value?.algorithmVersion && value.algorithmVersion !== '1.0.0' ? 'unsupported-version' : 'malformed')
  return Object.freeze({
    status: value.status, algorithmVersion: value.algorithmVersion ?? '1.0.0',
    requestedAt: timestamp(value.requestedAt, true), startedAt: timestamp(value.startedAt, true),
    completedAt: timestamp(value.completedAt, true), errorCode: typeof value.errorCode === 'string' ? value.errorCode : null,
  })
}

export { DIMENSIONS as MOVIEDNA_DIMENSIONS }
import { resolveDimensionLabel } from './dimensionLabels.js'
