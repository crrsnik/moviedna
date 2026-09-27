import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCustomLists } from '../hooks/useCustomLists.js'
import { useLibraryAction } from '../hooks/useLibraryAction.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'
import LibraryDialog, { libraryButton } from './LibraryDialog.jsx'
export default function ManageListsPanel({ uid, media, listIds, onClose }) {
  const lists = useCustomLists(uid), action = useLibraryAction()
  const [selected, setSelected] = useState(() => [...listIds])
  const known = new Set(lists.data?.map(list => list.id))
  const missing = selected.some(id => !known.has(id))
  const toggle = id => setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id])
  return <LibraryDialog title="Manage lists" pending={action.pending} onClose={onClose}>
    {lists.loading ? <p role="status">Loading lists…</p> : lists.error ? <p role="alert">{lists.error}</p> : <>
      {!lists.data.length ? <p>No custom lists yet. <Link to="/library?view=favorites" className="underline" onClick={onClose}>Create a list in your Library</Link>.</p> : <fieldset disabled={action.pending} className="space-y-3"><legend className="mb-3">Choose lists for this title ({selected.length}/20)</legend>{lists.data.map(list => <label key={list.id} className="flex items-start gap-3 break-all"><input type="checkbox" checked={selected.includes(list.id)} onChange={() => toggle(list.id)} className="mt-1 size-4 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4" />{list.name}</label>)}</fieldset>}
      {selected.length > 20 && <p role="alert">Choose no more than 20 lists for this title.</p>}
      {missing && <p role="alert">Some selected lists no longer exist. <button type="button" className="underline" disabled={action.pending} onClick={() => setSelected(previous => previous.filter(id => known.has(id)))}>Clear missing selections</button>.</p>}
    </>}
    {action.error && <p role="alert" className="mt-3">{action.error}</p>}
    {(lists.error || action.error) && <button type="button" className={`${libraryButton} mt-3`} disabled={action.pending} onClick={lists.retry}>Refresh lists</button>}
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" className={libraryButton} disabled={action.pending} onClick={onClose}>Cancel</button><button type="button" className={libraryButton} disabled={action.pending || lists.loading || Boolean(lists.error) || missing || selected.length > 20} onClick={() => action.run(() => mediaLibraryService.updateMediaListMemberships(uid, media, selected), onClose)}>{action.pending ? 'Saving…' : 'Save'}</button></div>
  </LibraryDialog>
}
