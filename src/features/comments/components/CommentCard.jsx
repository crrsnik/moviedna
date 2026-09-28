import { useState } from 'react'
import { libraryButton } from '../../library/components/LibraryDialog.jsx'
export default function CommentCard({ comment }) {
  const [revealed, setRevealed] = useState(false)
  const { updatedAt, createdAt } = comment
  const edited = updatedAt.seconds > createdAt.seconds || (updatedAt.seconds === createdAt.seconds && updatedAt.nanoseconds > createdAt.nanoseconds)
  const date = new Date(updatedAt.seconds * 1000).toISOString()
  return <article className="min-w-0 space-y-3 rounded-xl border border-zinc-700 p-4">
    <p className="break-words font-semibold">{comment.authorDisplayName} <span className="font-normal text-zinc-400">@{comment.authorUsername}</span></p>
    <p className="text-sm text-zinc-400"><time dateTime={date}>{new Date(date).toLocaleDateString('en-US')}</time>{edited && ' · Edited'}</p>
    {comment.containsSpoiler && <p className="text-sm text-amber-300">Contains spoilers</p>}
    {comment.containsSpoiler && !revealed ? <button type="button" className={libraryButton} aria-expanded={false} onClick={() => setRevealed(true)}>Show spoiler</button> : <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{comment.text}</p>}
  </article>
}
