import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { useAuth } from '../../auth/hooks/useAuth.js'
import { useMovieDna } from '../../dna/hooks/useMovieDna.js'
import { recommendationRevision } from './recommendationLifecycle.js'
import { deriveRecommendationState } from './recommendationState.js'
import { recommendationCache } from '../services/recommendationCache.js'
import { recommendationService } from '../services/recommendationService.js'

export function useRecommendations() {
  const { user } = useAuth()
  const dna = useMovieDna()

  const uid = user?.uid ?? null
  const revision = recommendationRevision(
    uid,
    dna,
  )

  const [retryState, setRetryState] = useState({
    revision: null,
    count: 0,
  })

  const retryAttempt =
    retryState.revision === revision
      ? retryState.count
      : 0

  const [snapshot, setSnapshot] = useState({
    uid,
    revision,
    loading: Boolean(uid && revision),
    data: null,
    error: null,
  })

  useEffect(() => {
    if (!uid || !revision) {
      return undefined
    }

    const cached = recommendationCache.get(
      uid,
      revision,
    )

    if (
      cached !== null
      && retryAttempt === 0
    ) {
      setSnapshot({
        uid,
        revision,
        loading: false,
        data: cached,
        error: null,
      })

      return undefined
    }

    let active = true

    setSnapshot({
      uid,
      revision,
      loading: true,
      data: null,
      error: null,
    })

    recommendationCache
      .load(
        uid,
        revision,
        () =>
          recommendationService.getRecommendations(),
        {
          force: retryAttempt > 0,
        },
      )
      .then(data => {
        if (!active) return

        setSnapshot({
          uid,
          revision,
          loading: false,
          data,
          error: null,
        })
      })
      .catch(error => {
        if (!active) return

        setSnapshot({
          uid,
          revision,
          loading: false,
          data: null,
          error,
        })
      })

    return () => {
      active = false
    }
  }, [
    uid,
    revision,
    retryAttempt,
  ])

  const retry = useCallback(() => {
    if (!uid || !revision) return

    setRetryState(previous => ({
      revision,
      count:
        previous.revision === revision
          ? previous.count + 1
          : 1,
    }))
  }, [
    uid,
    revision,
  ])

  const cached = uid && revision
    ? recommendationCache.get(
        uid,
        revision,
      )
    : null

  let effectiveSnapshot

  if (!uid) {
    effectiveSnapshot = {
      loading: false,
      data: null,
      error: null,
      unavailable: false,
    }
  } else if (
    dna.kind === 'malformed'
    || dna.kind === 'error'
  ) {
    effectiveSnapshot = {
      loading: false,
      data: null,
      error: {
        code: 'movie-dna-unavailable',
      },
      unavailable: false,
    }
  } else if (
    dna.kind === 'empty'
    || dna.kind === 'insufficient'
    || (
      dna.kind === 'failed'
      && !revision
    )
  ) {
    effectiveSnapshot = {
      loading: false,
      data: null,
      error: null,
      unavailable: true,
    }
  } else if (!revision) {
    effectiveSnapshot = {
      loading: true,
      data: null,
      error: null,
      unavailable: false,
    }
  } else if (
    snapshot.uid === uid
    && snapshot.revision === revision
  ) {
    effectiveSnapshot = snapshot
  } else if (cached !== null) {
    effectiveSnapshot = {
      loading: false,
      data: cached,
      error: null,
      unavailable: false,
    }
  } else {
    effectiveSnapshot = {
      loading: true,
      data: null,
      error: null,
      unavailable: false,
    }
  }

  return {
    ...deriveRecommendationState(
      effectiveSnapshot,
    ),
    retry,
  }
}
