import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { useAuth } from '../../auth/hooks/useAuth.js'
import { useMovieDna } from '../../dna/hooks/useMovieDna.js'
import { useViewingHistory } from '../../viewingHistory/hooks/useViewingHistory.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { toTmdbLanguage } from '../../../shared/config/tmdb.js'
import { recommendationRevision } from './recommendationLifecycle.js'
import { deriveRecommendationState } from './recommendationState.js'
import { recommendationCache } from '../services/recommendationCache.js'
import { recommendationService } from '../services/recommendationService.js'

export function useRecommendations() {
  const { user } = useAuth()
  const dna = useMovieDna()
  const { locale } = useTranslation()
  const language = toTmdbLanguage(locale)

  const uid = user?.uid ?? null
  const history = useViewingHistory()

  const historyReady = (
    !uid
    || (
      !history.loading
      && !history.error
      && Array.isArray(history.data)
    )
  )

  const revision = historyReady
    ? recommendationRevision(
      uid,
      dna,
      history.data ?? [],
    )
    : null

  // Recommendations with the same DNA revision but a different
  // display language must not share a cached response.
  const localizedRevision = revision
    ? `${revision}\u0000${language}`
    : null

  const [retryState, setRetryState] = useState({
    revision: null,
    count: 0,
  })

  const retryAttempt =
    retryState.revision === localizedRevision
      ? retryState.count
      : 0

  const [snapshot, setSnapshot] = useState({
    uid,
    revision: localizedRevision,
    loading: Boolean(uid && localizedRevision),
    data: null,
    error: null,
  })

  useEffect(() => {
    if (!uid || !localizedRevision) {
      return undefined
    }

    const cached = recommendationCache.get(
      uid,
      localizedRevision,
    )

    if (
      cached !== null
      && retryAttempt === 0
    ) {
      setSnapshot({
        uid,
        revision: localizedRevision,
        loading: false,
        data: cached,
        error: null,
      })

      return undefined
    }

    let active = true

    setSnapshot({
      uid,
      revision: localizedRevision,
      loading: true,
      data: null,
      error: null,
    })

    recommendationCache
      .load(
        uid,
        localizedRevision,
        () =>
          recommendationService.getRecommendations(
            language,
          ),
        {
          force: retryAttempt > 0,
        },
      )
      .then(data => {
        if (!active) return

        setSnapshot({
          uid,
          revision: localizedRevision,
          loading: false,
          data,
          error: null,
        })
      })
      .catch(error => {
        if (!active) return

        setSnapshot({
          uid,
          revision: localizedRevision,
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
    localizedRevision,
    retryAttempt,
    language,
  ])

  const retry = useCallback(() => {
    if (!uid || !localizedRevision) return

    setRetryState(previous => ({
      revision: localizedRevision,
      count:
        previous.revision === localizedRevision
          ? previous.count + 1
          : 1,
    }))
  }, [
    uid,
    localizedRevision,
  ])

  const cached = uid && localizedRevision
    ? recommendationCache.get(
        uid,
        localizedRevision,
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
  } else if (history.error) {
    effectiveSnapshot = {
      loading: false,
      data: null,
      error: {
        code: 'watched-media-unavailable',
      },
      unavailable: false,
    }
  } else if (history.loading) {
    effectiveSnapshot = {
      loading: true,
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
    && snapshot.revision === localizedRevision
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
