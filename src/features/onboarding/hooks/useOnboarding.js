import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { useUserProfile } from '../../profile/hooks/useUserProfile.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { toTmdbLanguage } from '../../../shared/config/tmdb.js'
import { getTmdbErrorMessage, TmdbError } from '../../catalog/services/tmdbErrors.js'
import { loadOnboardingResponses, saveOnboardingResponse, completeOnboarding } from '../services/onboardingService.js'
import { getOnboardingErrorMessage } from '../services/onboardingErrors.js'
import { loadCuratedOnboardingCatalog } from '../services/onboardingCuratedCatalog.js'
import { canReachMinimum, getDeckState, getOnboardingProgress, prepareOnboardingDeck } from '../utils/onboardingDeck.js'
import { getOnboardingMediaKey, MAX_RESPONSES } from '../validation/onboardingValidation.js'
import {
  clearOnboardingResultPending,
  markOnboardingResultPending,
} from '../constants/onboardingResult.js'

export function useOnboarding() {
  const { user } = useAuth()
  const { hasCompletedOnboarding } = useUserProfile()
  const { locale } = useTranslation()
  const tmdbLanguage = toTmdbLanguage(locale)
  const uid = user?.uid
  const sessionRef = useRef(null)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ deck: [], responses: [], isLoading: true, isSaving: false, isCompleting: false, loadError: null, actionError: null })

  useEffect(() => {
    const controller = new AbortController()
    const session = {
      active: true,
      busy: false,
      savedIds: new Set(),
    }

    sessionRef.current = session

    if (uid && !hasCompletedOnboarding) {
      setState((current) => ({
        ...current,
        isLoading: true,
        loadError: null,
        actionError: null,
      }))

      void (async () => {
        const responses = await loadOnboardingResponses({
          uid,
        })

        const movies = await loadCuratedOnboardingCatalog({
          responses,
          language: tmdbLanguage,
          signal: controller.signal,
        })

        if (!session.active) return

        const deck = prepareOnboardingDeck(
          movies,
          responses,
        )
        const progress = getOnboardingProgress(
          responses,
        )

        session.savedIds = new Set(
          responses
            .map((response) => getOnboardingMediaKey(
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
          isCompleting: false,
          loadError: canReachMinimum(
            progress,
            deck.length,
          )
            ? null
            : 'There are not enough new titles to reach your goals right now. Please retry later.',
          actionError: null,
        })
      })().catch((error) => {
        if (!session.active) return

        controller.abort()

        setState((current) => ({
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

  const progress = getOnboardingProgress(state.responses)
  const { currentMovie, remainingMovies } = getDeckState(state.deck, state.responses)

  function retry() {
    if (sessionRef.current?.busy) return
    if (sessionRef.current) sessionRef.current.active = false
    setState((current) => ({ ...current, isLoading: true, loadError: null, actionError: null }))
    setAttempt((current) => current + 1)
  }

  async function reactToMovie(reaction) {
    const session = sessionRef.current
    const currentMediaKey = getOnboardingMediaKey(
      currentMovie?.mediaType,
      currentMovie?.id,
    )

    if (!session?.active || session.busy || state.isLoading || state.loadError || hasCompletedOnboarding
      || !currentMovie || !currentMediaKey || session.savedIds.has(currentMediaKey)
      || progress.responseCount >= MAX_RESPONSES) return
    session.busy = true
    setState((current) => ({ ...current, isSaving: true, actionError: null }))
    try {
      const response = await saveOnboardingResponse({ uid, movie: currentMovie, reaction })
      if (!session.active) return
      session.savedIds.add(currentMediaKey)
      setState((current) => ({
        ...current,
        responses: [
          ...current.responses.filter((item) => (
            getOnboardingMediaKey(
              item.mediaType,
              item.tmdbId,
            ) !== currentMediaKey
          )),
          response,
        ],
      }))
    } catch (error) {
      if (session.active) setState((current) => ({ ...current, actionError: getOnboardingErrorMessage(error) }))
    } finally {
      session.busy = false
      if (session.active) setState((current) => ({ ...current, isSaving: false }))
    }
  }

  async function complete() {
    const session = sessionRef.current
    if (!session?.active || session.busy || state.isLoading || !progress.canFinish || hasCompletedOnboarding) return
    session.busy = true
    setState((current) => ({
      ...current,
      isCompleting: true,
      actionError: null,
    }))

    markOnboardingResultPending()

    try {
      await completeOnboarding({ uid })
      // Keep actions locked until the confirmed profile snapshot
      // triggers the route handoff to the result screen.
    } catch (error) {
      clearOnboardingResultPending()
      session.busy = false

      if (session.active) {
        setState((current) => ({
          ...current,
          isCompleting: false,
          actionError:
            getOnboardingErrorMessage(error),
        }))
      }
    }
  }

  return { ...state, currentMovie, remainingMovies, counts: progress, progress, retry, reactToMovie, complete }
}
