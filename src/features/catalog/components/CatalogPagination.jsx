import { getPagination } from '../validation/searchValidation.js'
export default function CatalogPagination({ page, data, loading, onChange }) {
  const pagination = getPagination(data?.page ?? page, data?.totalPages ?? 0)
  function go(target) { if (data && !loading && target !== null) onChange(target) }
  const button = 'rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40'
  // Keep controls mounted and focusable during requests; guarded handlers prevent invalid navigation.
  return <nav aria-label="Catalog pagination" className="flex flex-wrap items-center justify-center gap-4">
    <button type="button" aria-disabled={!data || loading || !pagination.previous} onClick={() => go(pagination.previous)} className={button}>Previous</button>
    <span role="status" className="text-sm text-zinc-400">{loading ? 'Loading page…' : data ? `Page ${data.totalPages ? pagination.page : 0} of ${data.totalPages}` : 'Page unavailable'}</span>
    <button type="button" aria-disabled={!data || loading || !pagination.next} onClick={() => go(pagination.next)} className={button}>Next</button>
  </nav>
}
