import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import SearchForm from '../features/catalog/components/SearchForm.jsx'
import MediaCard from '../features/catalog/components/MediaCard.jsx'
import PersonCard from '../features/catalog/components/PersonCard.jsx'
import { useCatalogSearch } from '../features/catalog/hooks/useCatalogSearch.js'
import { changeSearch, createSearchParams, getPagination, getQueryError, readSearchParams } from '../features/catalog/validation/searchValidation.js'

const filters = [['all', 'All'], ['movie', 'Movies'], ['tv', 'TV Shows'], ['person', 'People']]
const button = 'rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:cursor-not-allowed disabled:opacity-40'
export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const search = readSearchParams(params)
  const { query, type, page } = search
  const { data, loading, error, retry } = useCatalogSearch(search)
  const pagination = getPagination(data?.page ?? page, data?.totalPages ?? 1)
  const canonical = createSearchParams(search).toString()
  useEffect(() => {
    // Clamp direct out-of-range links after the server reports the available pages.
    const target = data && data.page !== page ? createSearchParams({ query, type, page: data.page }).toString() : canonical
    if (params.toString() !== target) setParams(target, { replace: true })
  }, [canonical, data, page, params, query, setParams, type])
  return (
    <section className="w-full min-w-0 space-y-8" aria-labelledby="search-title">
      <h1 id="search-title" className="break-words text-3xl font-semibold">{query ? `Search results for “${query}”` : 'Search MovieDNA'}</h1>
      <SearchForm query={query} type={type} />
      <nav aria-label="Search type" className="flex flex-wrap gap-2">
        {filters.map(([value, label]) => <button key={value} type="button" aria-current={type === value ? 'true' : undefined} className={`${button} ${type === value ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} onClick={() => setParams(changeSearch(search, { type: value }))}>{label}</button>)}
      </nav>
      {getQueryError(query) ? <p className="text-zinc-400">{getQueryError(query)}</p> : loading ? <p role="status" aria-live="polite">Searching…</p> : error ? (
        <div className="space-y-4"><p role="alert">{error}</p><button type="button" className={button} onClick={retry}>Retry</button></div>
      ) : data && (
        <>
          <p role="status" className="text-sm text-zinc-400">{data.totalResults} results</p>
          {data.results.length ? <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {data.results.map((item) => item.mediaType === 'person' ? <PersonCard key={`person:${item.id}`} person={item} /> : <MediaCard key={`${item.mediaType}:${item.id}`} media={item} fluid showType />)}
          </div> : <p className="break-words">No results found for “{query}”. Try a different search.</p>}
          <nav aria-label="Search pagination" className="flex flex-wrap items-center justify-center gap-4">
            <button type="button" className={button} disabled={!pagination.previous} onClick={() => setParams(changeSearch(search, { page: pagination.previous }))}>Previous</button>
            <span className="text-sm">Page {data.totalPages ? pagination.page : 0} of {data.totalPages}</span>
            <button type="button" className={button} disabled={!pagination.next} onClick={() => setParams(changeSearch(search, { page: pagination.next }))}>Next</button>
          </nav>
        </>
      )}
    </section>
  )
}
