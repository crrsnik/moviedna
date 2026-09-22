import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalogBrowse } from '../hooks/useCatalogBrowse.js'
import { BROWSE_VIEWS, readBrowseParams, createBrowseParams, changeBrowse } from '../validation/browseValidation.js'
import CatalogViewTabs from './CatalogViewTabs.jsx'
import GenreFilter from './GenreFilter.jsx'
import CatalogGrid from './CatalogGrid.jsx'
import CatalogPagination from './CatalogPagination.jsx'

const nouns = { movie: 'movies', tv: 'TV shows', person: 'actors' }
export default function CatalogBrowser({ type }) {
  const [params, setParams] = useSearchParams()
  const state = readBrowseParams(type, params)
  const { view, genre, page } = state
  const { catalog, genres } = useCatalogBrowse(type, state)
  const canonical = createBrowseParams(type, state).toString()
  const selectedGenre = genres.data?.find((item) => item.id === genre)
  const unknownGenre = genre !== null && genres.data !== null && !selectedGenre
  useEffect(() => {
    const target = unknownGenre ? createBrowseParams(type, {}).toString()
      : catalog.data && catalog.data.page !== page ? createBrowseParams(type, { view, genre, page: catalog.data.page }).toString() : canonical
    if (params.toString() !== target) setParams(target, { replace: true })
  }, [unknownGenre, catalog.data, canonical, type, view, genre, page, params, setParams])
  const heading = genre ? selectedGenre ? `${selectedGenre.name} ${nouns[type]}` : `${nouns[type]} by genre` : `${BROWSE_VIEWS[type][view]} ${nouns[type]}`
  return <div className="min-w-0 space-y-6">
    <CatalogViewTabs views={BROWSE_VIEWS[type]} selected={view} onChange={(value) => setParams(changeBrowse(type, state, { view: value }))} />
    {type !== 'person' && <GenreFilter state={genres} selected={genre} onChange={(value) => setParams(changeBrowse(type, state, { genre: value }))} />}
    <h2 className="text-xl font-semibold">{heading}</h2>
    <CatalogGrid state={catalog} />
    <CatalogPagination page={page} data={catalog.data} loading={catalog.loading} onChange={(value) => setParams(changeBrowse(type, state, { page: value }))} />
  </div>
}
