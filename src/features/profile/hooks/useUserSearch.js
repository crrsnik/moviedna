import { useEffect, useState } from 'react'

import {
  getPublicProfileByUsername,
} from '../services/publicProfileService.js'

import {
  getUserSearchError,
  normalizeUserSearchQuery,
} from '../validation/userSearchValidation.js'

export function useUserSearch(query) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)

  const username = normalizeUserSearchQuery(query)
  const validation = username
    ? getUserSearchError(username)
    : null

  const valid = Boolean(username) && !validation
  const key = JSON.stringify([username, attempt])

  useEffect(() => {
    if (!valid) return

    let active = true

    getPublicProfileByUsername(username)
      .then((result) => {
        if (!active) return

        setState({
          key,
          result,
          loading: false,
          error: null,
        })
      })
      .catch((error) => {
        if (!active) return

        setState({
          key,
          result: null,
          loading: false,
          error,
        })
      })

    return () => {
      active = false
    }
  }, [key, username, valid])

  const visible = valid && state?.key === key
    ? state
    : {
        result: null,
        loading: valid,
        error: null,
      }

  return {
    ...visible,
    retry: () => setAttempt((value) => value + 1),
  }
}
