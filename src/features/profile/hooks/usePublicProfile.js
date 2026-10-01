import { useEffect, useState } from 'react'

import { getPublicProfileByUsername } from '../services/publicProfileService.js'

export function usePublicProfile(username) {
  const [state, setState] = useState({
    username: null,
    loading: true,
    result: null,
    error: null,
  })

  useEffect(() => {
    let active = true

    setState({
      username,
      loading: true,
      result: null,
      error: null,
    })

    getPublicProfileByUsername(username)
      .then((result) => {
        if (!active) return

        setState({
          username,
          loading: false,
          result,
          error: null,
        })
      })
      .catch((error) => {
        if (!active) return

        setState({
          username,
          loading: false,
          result: null,
          error,
        })
      })

    return () => {
      active = false
    }
  }, [username])

  if (state.username !== username) {
    return {
      loading: true,
      result: null,
      error: null,
    }
  }

  return state
}
