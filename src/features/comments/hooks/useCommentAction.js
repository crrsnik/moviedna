import { useEffect, useState } from 'react'
import { createLibraryAction } from '../../library/services/libraryAction.js'
import { toCommentError } from '../services/commentErrors.js'
export function useCommentAction() {
  const [controller] = useState(createLibraryAction)
  const [state, setState] = useState({ pending: false, error: null, operation: null })
  useEffect(() => { controller.activate(); return () => controller.dispose() }, [controller])
  return { ...state, run: (operation, callback, success) => controller.run(callback, patch => setState(previous => ({ ...previous, ...patch, operation, ...(patch.error ? { error: toCommentError(patch.error).message } : {}) })), success) }
}
