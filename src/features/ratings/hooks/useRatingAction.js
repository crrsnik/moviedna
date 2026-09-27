import { useEffect, useState } from 'react'
import { createLibraryAction } from '../../library/services/libraryAction.js'
import { toRatingError } from '../services/ratingErrors.js'
export function useRatingAction() {
  const [controller] = useState(createLibraryAction)
  const [state, setState] = useState({ pending: false, error: null, operation: null })
  useEffect(() => { controller.activate(); return () => controller.dispose() }, [controller])
  return { ...state, run: (operation, callback, onSuccess) => controller.run(callback, patch => setState(previous => ({ ...previous, ...patch, operation, ...(patch.error ? { error: toRatingError(patch.error).message } : {}) })), onSuccess) }
}
