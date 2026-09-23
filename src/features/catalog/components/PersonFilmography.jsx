import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMediaDetailPath } from '../validation/detailRouteValidation.js'
export default function PersonFilmography({ title, credits }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  if (!credits.length) return null
  return <section aria-labelledby={`${id}-heading`} className="space-y-4">
    <h2 id={`${id}-heading`} className="text-2xl font-semibold">{title}</h2>
    <ul id={id} className="divide-y divide-zinc-800">{(expanded ? credits : credits.slice(0, 12)).map((credit) => <li key={`${credit.mediaType}:${credit.id}`}>
      <Link to={getMediaDetailPath(credit)} className="grid min-w-0 gap-1 rounded py-3 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 sm:grid-cols-[4rem_minmax(0,1fr)]">
        <span className="text-sm text-zinc-400">{credit.releaseYear || 'Undated'}</span>
        <span className="min-w-0"><span className="break-words font-medium">{credit.title}</span><span className="ml-2 text-xs text-zinc-500">{credit.mediaType === 'movie' ? 'Movie' : 'TV'}</span>{credit.roleLabel && <span className="mt-1 block break-words text-sm text-zinc-400">{credit.roleLabel}</span>}</span>
      </Link>
    </li>)}</ul>
    {credits.length > 12 && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((value) => !value)} className="rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4">{expanded ? 'Show less' : 'Show all'}</button>}
  </section>
}
