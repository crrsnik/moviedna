import { useId, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { useUserProfile } from '../../profile/hooks/useUserProfile.js'
import { detailToSnapshot, getMediaKey } from '../../library/validation/libraryValidation.js'
import { libraryButton } from '../../library/components/LibraryDialog.jsx'
import { useMediaRating } from '../hooks/useMediaRating.js'
import { useRatingAction } from '../hooks/useRatingAction.js'
import { ratingService } from '../services/ratingService.js'
function RatingControl({ uid, media, mediaKey }) {
  const { data, loading, error, retry } = useMediaRating(uid, mediaKey)
  const action = useRatingAction(), id = useId()
  const [draft, setDraft] = useState(null)
  const score = draft ?? data?.score ?? null
  return <section aria-labelledby={id} className="min-w-0 space-y-4 rounded-xl border border-zinc-700 p-4">
    <h2 id={id} className="text-xl font-semibold">Your rating</h2>
    {loading ? <p role="status">Loading your rating…</p> : error ? <div className="space-y-3"><p role="alert">{error}</p><button type="button" className={libraryButton} disabled={action.pending} onClick={retry}>Retry rating</button></div> : <>
      <p role="status" aria-live="polite">{data ? `Your rating: ${data.score}/10` : 'You have not rated this title yet.'}</p>
      <fieldset disabled={action.pending} className="space-y-2"><legend>Choose your rating, from 1 to 10</legend><div className="flex flex-wrap gap-2">{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <label key={value} className="flex cursor-pointer items-center gap-2 rounded border border-zinc-600 px-3 py-2 has-checked:bg-zinc-700"><input type="radio" name={`${id}-score`} value={value} checked={score === value} onChange={() => setDraft(value)} aria-label={`${value} out of 10`} className="focus-visible:outline-2 focus-visible:outline-offset-4" />{value}</label>)}</div></fieldset>
      <div className="flex flex-wrap gap-3"><button type="button" className={libraryButton} disabled={action.pending || score === null || score === data?.score} onClick={() => action.run('save', () => ratingService.saveRating(uid, media, score), () => setDraft(null))}>{action.pending && action.operation === 'save' ? 'Saving…' : 'Save rating'}</button>{data && <button type="button" className={libraryButton} disabled={action.pending} onClick={() => action.run('remove', () => ratingService.deleteRating(uid, mediaKey), () => setDraft(null))}>{action.pending && action.operation === 'remove' ? 'Removing…' : 'Remove rating'}</button>}</div>
    </>}
    {action.error && <p role="alert">{action.error}</p>}
  </section>
}
export default function MediaRatingControl({ mediaType, detail }) {
  const { user } = useAuth()
  const { profile, isProfileLoading, profileError, hasCompletedOnboarding } = useUserProfile()
  if (!user || !profile || isProfileLoading || profileError || !hasCompletedOnboarding) return null
  let media, mediaKey
  try { media = detailToSnapshot(mediaType, detail); mediaKey = getMediaKey(mediaType, media.tmdbId) } catch { return <p role="alert">This title cannot be rated.</p> }
  return <RatingControl key={`${user.uid}:${mediaKey}`} uid={user.uid} media={media} mediaKey={mediaKey} />
}
