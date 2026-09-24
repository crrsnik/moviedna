import { Link } from 'react-router-dom'
import { libraryViewParams } from '../validation/libraryValidation.js'
export default function LibraryViewTabs({ view }) {
  return <nav aria-label="Library views" className="flex flex-wrap gap-3">{[['favorites', 'Favorites'], ['watchlist', 'To Watch']].map(([value, label]) => <Link key={value} to={`?${libraryViewParams(value)}`} aria-current={view === value ? 'page' : undefined} className={`rounded-lg border px-4 py-2 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 ${view === value ? 'border-zinc-100 bg-zinc-800' : 'border-zinc-700'}`}>{label}</Link>)}</nav>
}
