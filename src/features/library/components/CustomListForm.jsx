import { useId, useState } from 'react'
import { normalizeListInput } from '../validation/customListValidation.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'
import { useLibraryAction } from '../hooks/useLibraryAction.js'
import LibraryDialog, { libraryButton } from './LibraryDialog.jsx'
export default function CustomListForm({ uid, list, onClose, onSaved }) {
  const [name, setName] = useState(list?.name ?? ''), [description, setDescription] = useState(list?.description ?? '')
  const action = useLibraryAction(), id = useId()
  let valid = true
  const visibility = list?.visibility ?? 'private'
  try {
    normalizeListInput({ name, description, visibility })
  } catch {
    valid = false
  }
  const submit = event => {
    event.preventDefault()
    if (!valid) return
    action.run(
      () => list
        ? mediaLibraryService.updateCustomList(
          uid,
          list.id,
          { name, description, visibility },
        )
        : mediaLibraryService.createCustomList(
          uid,
          { name, description, visibility },
        ),
      result => onSaved(result ?? list?.id),
    )
  }
  return <LibraryDialog title={list ? 'Edit list' : 'Create list'} pending={action.pending} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <div><label htmlFor={`${id}-name`} className="block">Name</label><input id={`${id}-name`} autoFocus required maxLength={60} value={name} disabled={action.pending} onChange={e => setName(e.target.value)} aria-describedby={`${id}-name-help`} className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2 focus-visible:outline-2" /><p id={`${id}-name-help`} className="text-sm text-zinc-400">{name.length}/60 · A name is required.</p></div>
      <div><label htmlFor={`${id}-description`} className="block">Description</label><textarea id={`${id}-description`} maxLength={300} value={description} disabled={action.pending} onChange={e => setDescription(e.target.value)} aria-describedby={`${id}-description-help`} className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2 focus-visible:outline-2" /><p id={`${id}-description-help`} className="text-sm text-zinc-400">{description.length}/300</p></div>
      {action.error && <p role="alert">{action.error}</p>}
      <div className="flex flex-wrap gap-3"><button type="button" className={libraryButton} disabled={action.pending} onClick={onClose}>Cancel</button><button type="submit" className={libraryButton} disabled={!valid || action.pending}>{action.pending ? list ? 'Saving…' : 'Creating…' : list ? 'Save changes' : 'Create'}</button></div>
    </form>
  </LibraryDialog>
}
