import { useId, useState } from 'react'
import LibraryDialog, { libraryButton } from '../../library/components/LibraryDialog.jsx'
import { useComments } from '../hooks/useComments.js'
import { useCommentAction } from '../hooks/useCommentAction.js'
import { commentService } from '../services/commentService.js'
import { validateCommentInput } from '../validation/commentValidation.js'
export default function CommentEditor({ uid, profile, media }) {
  const own = useComments(media, uid, true), action = useCommentAction(), id = useId()
  const [draft, setDraft] = useState(null), [validation, setValidation] = useState(null), [deleting, setDeleting] = useState(false)
  const input = draft ?? { text: '', containsSpoiler: false }
  const editing = draft !== null || !own.data
  function save(event) {
    event.preventDefault()
    try { validateCommentInput(input); setValidation(null) } catch (error) { setValidation(error.message); return }
    action.run('save', () => commentService.saveComment(uid, profile, media, input), () => setDraft(null))
  }
  if (own.loading) return <p role="status">Loading your comment…</p>
  if (own.error) return <p role="alert">{own.error}</p>
  return <div className="space-y-4">
    {editing ? <form onSubmit={save} className="space-y-3" aria-busy={action.pending}>
      <label htmlFor={id} className="block font-medium">{own.data ? 'Edit your comment' : 'Your comment'}</label>
      <textarea id={id} value={input.text} disabled={action.pending} onChange={event => { setDraft({ ...input, text: event.target.value }); setValidation(null) }} rows={4} aria-describedby={`${id}-count${validation ? ` ${id}-error` : ''}`} aria-invalid={Boolean(validation)} className="w-full min-w-0 rounded-lg border border-zinc-600 bg-zinc-900 p-3 focus-visible:outline-2 focus-visible:outline-offset-2" />
      <p id={`${id}-count`} className="text-sm text-zinc-400">{input.text.trim().length}/2000 characters after trim</p>
      {validation && <p id={`${id}-error`} role="alert">{validation}</p>}
      <label className="flex items-center gap-2"><input type="checkbox" checked={input.containsSpoiler} disabled={action.pending} onChange={event => setDraft({ ...input, containsSpoiler: event.target.checked })} className="focus-visible:outline-2 focus-visible:outline-offset-4" />Contains spoilers</label>
      <div className="flex flex-wrap gap-3"><button className={libraryButton} disabled={action.pending} type="submit">{action.pending ? 'Saving…' : 'Save comment'}</button>{draft !== null && <button type="button" className={libraryButton} disabled={action.pending} onClick={() => { setDraft(null); setValidation(null) }}>Cancel</button>}</div>
    </form> : <div className="flex flex-wrap items-center gap-3"><p>Your comment is published.</p><button type="button" className={libraryButton} disabled={action.pending} onClick={() => setDraft({ text: own.data.text, containsSpoiler: own.data.containsSpoiler })}>Edit comment</button><button type="button" className={libraryButton} disabled={action.pending} onClick={() => setDeleting(true)}>Delete comment</button></div>}
    {action.error && !deleting && <p role="alert">{action.error}</p>}
    {action.pending && <p role="status">{action.operation === 'delete' ? 'Deleting…' : 'Saving…'}</p>}
    {deleting && <LibraryDialog title="Delete your comment?" pending={action.pending} onClose={() => setDeleting(false)}>
      <p>This removes your comment from this title.</p>
      {action.error && <p role="alert">{action.error}</p>}
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" className={libraryButton} disabled={action.pending} onClick={() => setDeleting(false)} autoFocus>Cancel</button><button type="button" className={libraryButton} disabled={action.pending} onClick={() => action.run('delete', () => commentService.deleteComment(uid, media), () => { setDeleting(false); setDraft(null) })}>{action.pending ? 'Deleting…' : 'Confirm delete'}</button></div>
    </LibraryDialog>}
  </div>
}
