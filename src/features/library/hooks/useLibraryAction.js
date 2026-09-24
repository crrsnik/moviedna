import { useEffect, useState } from 'react'
import { createLibraryAction } from '../services/libraryAction.js'
import { toLibraryError } from '../services/libraryErrors.js'
export function useLibraryAction() {
  const [controller] = useState(createLibraryAction)
  const [state, setState] = useState({ pending: false, error: null })
  useEffect(() => { controller.activate(); return () => controller.dispose() }, [controller])
  return { ...state, run: operation => controller.run(operation, patch => setState(previous => ({ ...previous, ...patch, ...(patch.error ? { error: toLibraryError(patch.error).message } : {}) }))) }
}
