import { useLibraryAction } from '../hooks/useLibraryAction.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'
import LibraryDialog, { libraryButton } from './LibraryDialog.jsx'
export default function DeleteListDialog({ uid, list, onClose, onDeleted }) {
  const action = useLibraryAction()
  return <LibraryDialog title={`Delete “${list.name}”?`} pending={action.pending} onClose={onClose}>
    <p>Titles stay in Favorites, To Watch and your other lists. Removing this list can take several steps; completed removals cannot be undone.</p>
    {action.error && <p role="alert" className="mt-4">{action.error}</p>}
    <div className="mt-5 flex flex-wrap gap-3"><button autoFocus type="button" className={libraryButton} disabled={action.pending} onClick={onClose}>Cancel</button><button type="button" className={libraryButton} disabled={action.pending} onClick={() => action.run(() => mediaLibraryService.deleteCustomList(uid, list.id), onDeleted)}>{action.pending ? 'Deleting…' : 'Delete list'}</button></div>
  </LibraryDialog>
}
