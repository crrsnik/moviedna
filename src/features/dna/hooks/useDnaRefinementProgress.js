import {
  useEffect,
  useState,
} from 'react'

import {
  collection,
  onSnapshot,
} from 'firebase/firestore'

import {
  db,
} from '../../../shared/config/firebase.js'

import {
  useAuth,
} from '../../auth/hooks/useAuth.js'

import {
  MAX_DNA_REFINEMENT_RESPONSES,
} from '../constants/dnaRefinement.js'


export function useDnaRefinementProgress() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [
    state,
    setState,
  ] = useState({
    uid,
    responseCount: 0,
    isLoading: Boolean(uid),
    error: null,
  })

  useEffect(() => {
    if (!uid) {
      setState({
        uid: null,
        responseCount: 0,
        isLoading: false,
        error: null,
      })

      return undefined
    }

    setState({
      uid,
      responseCount: 0,
      isLoading: true,
      error: null,
    })

    return onSnapshot(
      collection(
        db,
        'users',
        uid,
        'dnaRefinementResponses',
      ),
      snapshot => {
        setState({
          uid,
          responseCount: snapshot.size,
          isLoading: false,
          error: null,
        })
      },
      error => {
        setState({
          uid,
          responseCount: 0,
          isLoading: false,
          error,
        })
      },
    )
  }, [uid])

  return {
    responseCount: state.responseCount,
    isLoading: state.isLoading,
    error: state.error,
    isComplete:
      state.responseCount
      >= MAX_DNA_REFINEMENT_RESPONSES,
  }
}
