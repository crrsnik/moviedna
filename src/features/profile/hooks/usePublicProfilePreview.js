import { useEffect, useState } from 'react'

import {
  getPublicProfilePreview,
} from '../services/publicProfilePreviewService.js'

export function usePublicProfilePreview(uid) {
  const [state, setState] = useState({
    uid: null,
    loading: false,
    preview: null,
    error: null,
  })

  useEffect(() => {
    if (!uid) {
      setState({
        uid: null,
        loading: false,
        preview: null,
        error: null,
      })

      return
    }

    let active = true

    setState({
      uid,
      loading: true,
      preview: null,
      error: null,
    })

    getPublicProfilePreview(uid)
      .then((preview) => {
        if (!active) return

        setState({
          uid,
          loading: false,
          preview,
          error: null,
        })
      })
      .catch((error) => {
        if (!active) return

        setState({
          uid,
          loading: false,
          preview: null,
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
      preview: null,
      error: null,
    }
  }

  return state
}
