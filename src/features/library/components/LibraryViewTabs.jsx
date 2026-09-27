import { Link } from 'react-router-dom'
import { librarySelectionParams } from '../validation/customListValidation.js'
export default function LibraryViewTabs({ view }) {
  return <nav aria-label="Library views" className="flex flex-wrap gap-3">{[['favorites', 'Favorites'], ['watchlist', 'To Watch'], ['ratings', 'My Ratings']].map(([value, label]) => <Link key={value} to={`?${librarySelectionParams({ view: value })}`} aria-current={view === value ? 'page' : undefined} className={`rounded-lg border px-4 py-2 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 ${view === value ? 'border-zinc-100 bg-zinc-800' : 'border-zinc-700'}`}>{label}</Link>)}</nav>
}
