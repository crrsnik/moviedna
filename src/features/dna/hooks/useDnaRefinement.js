import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useAuth,
} from '../../auth/hooks/useAuth.js'

import {
  useUserProfile,
} from '../../profile/hooks/useUserProfile.js'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

import {
  toTmdbLanguage,
} from '../../../shared/config/tmdb.js'

import {
  getTmdbErrorMessage,
  TmdbError,
} from '../../catalog/services/tmdbErrors.js'

import {
  getOnboardingErrorMessage,
} from '../../onboarding/services/onboardingErrors.js'

import {
  loadOnboardingResponses,
} from '../../onboarding/services/onboardingService.js'

import {
  getOnboardingMediaKey,
} from '../../onboarding/validation/onboardingValidation.js'

import {
  MAX_DNA_REFINEMENT_RESPONSES,
} from '../constants/dnaRefinement.js'

import {
  loadDnaRefinementCatalog,
} from '../services/dnaRefinementCatalog.js'

import {
  loadDnaRefinementResponses,
  saveDnaRefinementResponse,
} from '../services/dnaRefinementService.js'


export function useDnaRefinement() {
  const { user } = useAuth()

  const {
    hasCompletedOnboarding,
  } = useUserProfile()

  const { locale } = useTranslation()

  const uid = user?.uid
  const tmdbLanguage = toTmdbLanguage(locale)

  const sessionRef = useRef(null)
  const [attempt, setAttempt] = useState(0)

  const [state, setState] = useState({
    deck: [],
    responses: [],
    isLoading: true,
    isSaving: false,
    loadError: null,
    actionError: null,
  })

  useEffect(() => {
    const controller = new AbortController()

    const session = {
      active: true,
      busy: false,
      savedIds: new Set(),
    }

    sessionRef.current = session

    if (
      uid
      && hasCompletedOnboarding
    ) {
      setState(current => ({
        ...current,
        isLoading: true,
        loadError: null,
        actionError: null,
      }))

      void (async () => {
        const [
          baseResponses,
          responses,
        ] = await Promise.all([
          loadOnboardingResponses({ uid }),
          loadDnaRefinementResponses({ uid }),
        ])

        if (!session.active) return

        const remaining = Math.max(
          0,
          MAX_DNA_REFINEMENT_RESPONSES
            - responses.length,
        )

        const deck = remaining > 0
          ? await loadDnaRefinementCatalog({
              baseResponses,
              refinementResponses: responses,
              language: tmdbLanguage,
              signal: controller.signal,
              limit: remaining,
            })
          : []

        if (!session.active) return

        session.savedIds = new Set(
          responses
            .map(response => getOnboardingMediaKey(
              response.mediaType,
              response.tmdbId,
            ))
            .filter(Boolean),
        )

        setState({
          deck,
          responses,
          isLoading: false,
          isSaving: false,
          loadError: null,
          actionError: null,
        })
      })().catch(error => {
        if (!session.active) return

        controller.abort()

        setState(current => ({
          ...current,
          isLoading: false,
          loadError: error instanceof TmdbError
            ? getTmdbErrorMessage(error)
            : getOnboardingErrorMessage(error),
        }))
      })
    }

    return () => {
      session.active = false
      controller.abort()
    }
  }, [
    uid,
    hasCompletedOnboarding,
    attempt,
    tmdbLanguage,
  ])

  const responseCount = state.responses.length

  const currentMovie = responseCount
    < MAX_DNA_REFINEMENT_RESPONSES
      ? state.deck[0] ?? null
      : null

  function retry() {
    if (sessionRef.current?.busy) return

    if (sessionRef.current) {
      sessionRef.current.active = false
    }

    setState(current => ({
      ...current,
      isLoading: true,
      loadError: null,
      actionError: null,
    }))

    setAttempt(current => current + 1)
  }

  async function reactToMovie(reaction) {
    const session = sessionRef.current

    const mediaKey = getOnboardingMediaKey(
      currentMovie?.mediaType,
      currentMovie?.id,
    )

    if (
      !session?.active
      || session.busy
      || state.isLoading
      || state.loadError
      || !hasCompletedOnboarding
      || !currentMovie
      || !mediaKey
      || session.savedIds.has(mediaKey)
      || responseCount
        >= MAX_DNA_REFINEMENT_RESPONSES
    ) {
      return
    }

    session.busy = true

    setState(current => ({
      ...current,
      isSaving: true,
      actionError: null,
    }))

    try {
      const response = await saveDnaRefinementResponse({
        uid,
        movie: currentMovie,
        reaction,
      })

      if (!session.active) return

      session.savedIds.add(mediaKey)

      setState(current => ({
        ...current,
        deck: current.deck.filter(movie => (
          getOnboardingMediaKey(
            movie.mediaType,
            movie.id,
          ) !== mediaKey
        )),
        responses: [
          ...current.responses,
          response,
        ],
      }))
    } catch (error) {
      if (session.active) {
        setState(current => ({
          ...current,
          actionError:
            getOnboardingErrorMessage(error),
        }))
      }
    } finally {
      session.busy = false

      if (session.active) {
        setState(current => ({
          ...current,
          isSaving: false,
        }))
      }
    }
  }

  return {
    ...state,
    currentMovie,
    responseCount,
    remainingCount: Math.max(
      0,
      MAX_DNA_REFINEMENT_RESPONSES
        - responseCount,
    ),
    isComplete:
      responseCount
      >= MAX_DNA_REFINEMENT_RESPONSES,
    retry,
    reactToMovie,
  }
}
