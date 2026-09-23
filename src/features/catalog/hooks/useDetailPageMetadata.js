import { useLayoutEffect } from 'react'
export function useDetailPageMetadata(id, title, fallback) {
  useLayoutEffect(() => {
    document.title = title ? `${title} — MovieDNA` : fallback
    return () => { document.title = 'MovieDNA' }
  }, [title, fallback])
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [id])
}
