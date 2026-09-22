import { useEffect, useState } from 'react'
import { browseMovies, browseTvShows, browsePeople, getMovieGenres, getTvGenres } from '../services/browseService.js'
import { getTmdbErrorMessage, isTmdbAbort } from '../services/tmdbErrors.js'

const loaders = { movie: browseMovies, tv: browseTvShows, person: browsePeople }
const genreLoaders = { movie: getMovieGenres, tv: getTvGenres }
function useBrowseResource(loader, options) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const serialized = JSON.stringify(options)
  const key = `${serialized}:${attempt}`
  useEffect(() => {
    if (!loader) return
    const controller = new AbortController()
    loader({ ...JSON.parse(serialized), signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ key, loader, data, loading: false, error: null })
    }).catch((error) => {
      if (!controller.signal.aborted && !isTmdbAbort(error)) setState({ key, loader, data: null, loading: false, error: getTmdbErrorMessage(error) })
    })
    return () => controller.abort()
  }, [loader, serialized, key])
  const visible = loader && state?.key === key && state.loader === loader ? state : { data: null, loading: !!loader, error: null }
  return { ...visible, retry: () => setAttempt((n) => n + 1) }
}
export function useCatalogBrowse(type, params) {
  const catalog = useBrowseResource(loaders[type], params)
  const genres = useBrowseResource(genreLoaders[type], {})
  return { catalog, genres }
}
