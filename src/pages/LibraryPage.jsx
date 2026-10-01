import UserRatings from '../features/ratings/components/UserRatings.jsx'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth.js'
import { useCustomLists } from '../features/library/hooks/useCustomLists.js'
import { normalizeLibrarySelection, librarySelectionParams } from '../features/library/validation/customListValidation.js'
import LibraryViewTabs from '../features/library/components/LibraryViewTabs.jsx'
import CustomListsNavigation from '../features/library/components/CustomListsNavigation.jsx'
import CustomListForm from '../features/library/components/CustomListForm.jsx'
import DeleteListDialog from '../features/library/components/DeleteListDialog.jsx'
import LibraryItems from '../features/library/components/LibraryItems.jsx'
import { libraryButton } from '../features/library/components/LibraryDialog.jsx'
function Library({ uid }) {
  const [params, setParams] = useSearchParams(), lists = useCustomLists(uid)
  const selection = normalizeLibrarySelection(params), canonical = librarySelectionParams(selection).toString()
  const [dialog, setDialog] = useState(null)
  useEffect(() => { if (params.toString() !== canonical) setParams(canonical, { replace: true }) }, [params, canonical, setParams])
  const selected = lists.data?.find(list => list.id === selection.listId)
  const close = () => setDialog(null)
  return <section className="w-full min-w-0 self-start space-y-6">
    <h1 className="text-3xl font-semibold">My Library</h1>
    <LibraryViewTabs view={selection.view} />
    <CustomListsNavigation lists={lists} selection={selection} onCreate={() => setDialog({ type: 'create' })} />
    {selection.view === 'list' ? selected ? <>
      <div className="space-y-3"><div><div className="flex flex-wrap items-center gap-3"><h2 className="break-words text-2xl font-semibold">{selected.name}</h2><span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">{selected.visibility === 'public' ? 'Public board' : 'Private list'}</span></div>{selected.description && <p className="mt-2 whitespace-pre-wrap break-words text-zinc-300">{selected.description}</p>}</div><div className="flex flex-wrap gap-3"><button type="button" className={libraryButton} onClick={() => setDialog({ type: 'edit', list: selected })}>Edit list</button><button type="button" className={libraryButton} onClick={() => setDialog({ type: 'delete', list: selected })}>Delete list</button></div></div>
      <LibraryItems key={selection.listId} uid={uid} {...selection} />
    </> : !lists.loading && !lists.error && <div><h2 className="text-xl">List not found</h2><Link to="?view=favorites" className="underline focus-visible:outline-2">Return to Favorites</Link></div>
      : selection.view === 'ratings' ? <UserRatings uid={uid} /> : <LibraryItems key={selection.view} uid={uid} {...selection} />}
    {dialog?.type === 'delete' ? <DeleteListDialog uid={uid} list={dialog.list} onClose={close} onDeleted={() => { close(); setParams({ view: 'favorites' }) }} /> : dialog && <CustomListForm uid={uid} list={dialog.list} onClose={close} onSaved={id => { close(); if (dialog.type === 'create') setParams(librarySelectionParams({ view: 'list', listId: id })) }} />}
  </section>
}
export default function LibraryPage() {
  const { user } = useAuth()
  return <Library key={user.uid} uid={user.uid} />
}
