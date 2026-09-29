import {
  buildRecommendationSourcePlan,
} from './core/buildRecommendationSourcePlan.js'
import {
  buildRecommendationCandidatePool,
} from './core/buildRecommendationCandidatePool.js'
import {
  prepareRecommendationCandidate,
} from './core/prepareRecommendationCandidates.js'
import {
  excludeKnownMedia,
  rankRecommendations,
} from './core/rankRecommendations.js'
import {
  RECOMMENDATION_ERROR_CODES,
  throwRecommendationError,
} from './core/recommendationErrors.js'

const DEFAULT_SOURCE_CONCURRENCY = 4
const MAX_SOURCE_CONCURRENCY = 8

function validDependency(value, methods) {
  return value
    && typeof value === 'object'
    && methods.every(
      method => typeof value[method] === 'function',
    )
}

function validConcurrency(value) {
  return Number.isSafeInteger(value)
    && value > 0
    && value <= MAX_SOURCE_CONCURRENCY
}

async function executeSourceRequest(
  sourceClient,
  request,
) {
  switch (request.type) {
    case 'trending':
      return sourceClient.getTrending(
        request.mediaType,
      )

    case 'popular':
      return sourceClient.getPopular(
        request.mediaType,
        request.page,
      )

    case 'topRated':
      return sourceClient.getTopRated(
        request.mediaType,
        request.page,
      )

    case 'genre':
      return sourceClient.discoverByGenre(
        request.mediaType,
        request.genreId,
        request.page,
      )

    default:
      throwRecommendationError(
        RECOMMENDATION_ERROR_CODES.INVALID_INPUT,
      )
  }
}

async function collectSources(
  sourceClient,
  requests,
  concurrency,
) {
  const results = new Array(requests.length)
  let cursor = 0

  async function worker() {
    while (cursor < requests.length) {
      const index = cursor
      cursor += 1

      try {
        results[index] = {
          ok: true,
          value: await executeSourceRequest(
            sourceClient,
            requests[index],
          ),
        }
      } catch (error) {
        results[index] = {
          ok: false,
          error,
        }
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          concurrency,
          requests.length,
        ),
      },
      worker,
    ),
  )

  const successful = results
    .filter(result => result?.ok)
    .map(result => result.value)

  const failed = results.filter(
    result => result && !result.ok,
  )

  if (!successful.length && failed.length) {
    throw failed[0].error
  }

  return {
    sources: successful,
    failureCount: failed.length,
  }
}

export function createRecommendationPipeline({
  sourceClient,
  metadataResolver,
  sourceConcurrency = DEFAULT_SOURCE_CONCURRENCY,
  maxPerMediaType = 100,
  maxGenres = 3,
} = {}) {
  if (
    !validDependency(
      sourceClient,
      [
        'getTrending',
        'getPopular',
        'getTopRated',
        'discoverByGenre',
      ],
    )
    || !validDependency(
      metadataResolver,
      ['resolve'],
    )
    || !validConcurrency(sourceConcurrency)
  ) {
    throwRecommendationError(
      RECOMMENDATION_ERROR_CODES.INVALID_INPUT,
    )
  }

  async function run({
    dna,
    rated = [],
    hidden = [],
  } = {}) {
    const sourcePlan = buildRecommendationSourcePlan({
      dna,
      maxGenres,
    })

    const collected = await collectSources(
      sourceClient,
      sourcePlan.requests,
      sourceConcurrency,
    )

    const pool = buildRecommendationCandidatePool({
      sources: collected.sources,
      maxPerMediaType,
    })

    const eligible = excludeKnownMedia(
      pool.candidates,
      {
        rated,
        hidden,
      },
    )

    const resolved = await metadataResolver.resolve(
      eligible,
    )

    if (!Array.isArray(resolved)) {
      throwRecommendationError(
        RECOMMENDATION_ERROR_CODES.INVALID_INPUT,
      )
    }

    const prepared = []
    let preparationRejectedCount = 0

    for (const candidate of resolved) {
      const normalized = prepareRecommendationCandidate(
        candidate,
      )

      if (normalized) {
        prepared.push(normalized)
      } else {
        preparationRejectedCount += 1
      }
    }

    const ranked = rankRecommendations({
      dna,
      candidates: prepared,
    })

    const displayByMediaKey = new Map(
      prepared.map(candidate => [
        candidate.mediaKey,
        candidate,
      ]),
    )

    const results = Object.freeze(
      ranked.results.map(result => {
        const display = displayByMediaKey.get(
          result.mediaKey,
        )

        return Object.freeze({
          ...result,
          posterPath: display?.posterPath ?? null,
          releaseDate: display?.releaseDate ?? null,
          voteAverage: display?.voteAverage ?? null,
          voteCount: display?.voteCount ?? 0,
        })
      }),
    )

    return Object.freeze({
      algorithmVersion: ranked.algorithmVersion,
      genreIds: sourcePlan.genreIds,
      results,
      stats: Object.freeze({
        sourceRequestCount:
          sourcePlan.requests.length,
        sourceSuccessCount:
          collected.sources.length,
        sourceFailureCount:
          collected.failureCount,
        sourceInputCount:
          pool.inputCount,
        sourceRejectedCount:
          pool.rejectedCount,
        duplicateCount:
          pool.duplicateCount,
        trimmedCount:
          pool.trimmedCount,
        knownExcludedCount:
          pool.candidates.length
          - eligible.length,
        metadataResolvedCount:
          resolved.length,
        preparationRejectedCount,
        rankingRejectedCount:
          ranked.rejectedCount,
      }),
    })
  }

  return Object.freeze({
    run,
  })
}
