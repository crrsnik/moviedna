import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { useUserProfile } from '../../profile/hooks/useUserProfile.js'
import { libraryButton } from '../../library/components/LibraryDialog.jsx'
import { commentIdentity, validateCommentProfile } from '../validation/commentValidation.js'
import { useComments } from '../hooks/useComments.js'
import CommentCard from './CommentCard.jsx'
import CommentEditor from './CommentEditor.jsx'
function Comments({ media }) {
  const { user } = useAuth(), { profile, isProfileLoading, profileError } = useUserProfile()
  const list = useComments(media), id = useId()
  let eligible = false
  if (user && !isProfileLoading && !profileError) {
    try { validateCommentProfile(user.uid, profile); eligible = true } catch { /* Read-only public comments remain available. */ }
  }
  return <section aria-labelledby={id} className="min-w-0 space-y-5">
    <h2 id={id} className="text-2xl font-semibold">Comments</h2>
    <p className="text-sm text-zinc-400">The 20 most recently updated comments. One comment per person for this title.</p>
    {!user ? <p><Link to="/login" className="underline focus-visible:outline-2 focus-visible:outline-offset-4">Log in</Link> to leave a comment.</p> : eligible ? <CommentEditor key={user.uid} uid={user.uid} profile={profile} media={media} /> : <p role="status">{isProfileLoading ? 'Loading your profile…' : 'A valid profile with completed onboarding is required to manage comments.'}</p>}
    {list.loading ? <p role="status">Loading comments…</p> : list.error ? <div className="space-y-3"><p role="alert">{list.error}</p><button type="button" className={libraryButton} onClick={list.retry}>Retry comments</button></div> : !list.data.length ? <p>No comments yet.</p> : <div className="space-y-4">{list.data.map(comment => <CommentCard key={comment.id} comment={comment} />)}</div>}
  </section>
}
export default function MediaComments({ mediaType, tmdbId }) {
  let media
  try { media = commentIdentity({ mediaType, tmdbId }) } catch { return null }
  return <Comments key={media.key} media={media} />
}
