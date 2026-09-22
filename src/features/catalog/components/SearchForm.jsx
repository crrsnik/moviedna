import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSearchParams, getQueryError, normalizeQuery } from '../validation/searchValidation.js'

export default function SearchForm({ query = '', type = 'all' }) {
  const id = useId()
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ source: query, value: query })
  const [error, setError] = useState(null)
  // Synchronize history navigation without remounting the input or losing focus.
  if (draft.source !== query) {
    setDraft({ source: query, value: query })
    setError(null)
  }
  const value = draft.source === query ? draft.value : query
  function submit(event) {
    event.preventDefault()
    const normalized = normalizeQuery(value)
    const validation = getQueryError(normalized)
    setError(validation)
    if (validation) return
    setDraft({ source: query, value: normalized })
    navigate(`/search?${createSearchParams({ query: normalized, type })}`)
  }
  return (
    <form role="search" onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-2">
      <label htmlFor={id} className="sr-only">Search movies, TV shows and actors</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input id={id} type="search" value={value} onChange={(event) => { setDraft({ source: query, value: event.target.value }); setError(null) }} placeholder="Search movies, TV shows and actors" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-zinc-100" />
        <button type="submit" className="rounded-lg bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100">Search</button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-rose-200">{error}</p>}
    </form>
  )
}
