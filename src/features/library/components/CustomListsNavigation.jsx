import { Link } from 'react-router-dom'
import { librarySelectionParams } from '../validation/customListValidation.js'
import { libraryButton } from './LibraryDialog.jsx'
export default function CustomListsNavigation({ lists, selection, onCreate }) {
  return <div className="space-y-3">
    <nav aria-label="Custom lists" className="flex max-w-full flex-wrap gap-2">{lists.data?.map(list => <Link key={list.id} to={`?${librarySelectionParams({ view: 'list', listId: list.id })}`} aria-current={selection.listId === list.id ? 'page' : undefined} className={`${libraryButton} max-w-full break-words ${selection.listId === list.id ? 'bg-zinc-700' : ''}`}>{list.name}</Link>)}</nav>
    {lists.loading && <p role="status">Loading lists…</p>}
    {lists.error && <div><p role="alert">{lists.error}</p><button type="button" className={libraryButton} onClick={lists.retry}>Retry lists</button></div>}
    <button type="button" className={libraryButton} onClick={onCreate}>Create list</button>
  </div>
}
