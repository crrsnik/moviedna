import {
  useEffect,
  useState,
} from 'react'

import {
  getPublicBoards,
} from '../services/publicBoardsService.js'

export function usePublicBoards(uid) {
  const [state, setState] = useState({
    uid: null,
    loading: false,
    boards: [],
    error: null,
  })

  useEffect(() => {
    if (!uid) {
      setState({
        uid: null,
        loading: false,
        boards: [],
        error: null,
      })

      return
    }

    let active = true

    setState({
      uid,
      loading: true,
      boards: [],
      error: null,
    })

    getPublicBoards(uid)
      .then(boards => {
        if (!active) return

        setState({
          uid,
          loading: false,
          boards,
          error: null,
        })
      })
      .catch(error => {
        if (!active) return

        setState({
          uid,
          loading: false,
          boards: [],
          error,
        })
      })

    return () => {
      active = false
    }
  }, [uid])

  if (state.uid !== uid) {
    return {
      loading: Boolean(uid),
      boards: [],
      error: null,
    }
  }

  return state
}
