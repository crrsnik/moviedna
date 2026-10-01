import { Link } from 'react-router-dom'

import { useSocialGraph } from '../features/friends/hooks/useSocialGraph.js'
import {
  PROFILE_AVATARS,
} from '../features/profile/constants/profileSettings.js'

const PRIMARY_BUTTON = (
  'rounded-lg bg-violet-500 px-3 py-2 '
  + 'text-sm font-semibold text-white '
  + 'transition hover:bg-violet-400 '
  + 'disabled:cursor-not-allowed '
  + 'disabled:opacity-50'
)

const SECONDARY_BUTTON = (
  'rounded-lg border border-zinc-700 '
  + 'px-3 py-2 text-sm font-medium '
  + 'text-zinc-200 transition '
  + 'hover:bg-zinc-800 '
  + 'disabled:cursor-not-allowed '
  + 'disabled:opacity-50'
)

function SocialUserCard({
  entry,
  kind,
  busy,
  onAccept,
  onDecline,
  onCancel,
  onRemove,
}) {
  const { profile } = entry

  const avatar = PROFILE_AVATARS.find(
    ({ id }) => id === profile.avatarId,
  ) ?? PROFILE_AVATARS[0]

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:flex-row sm:items-center">
      <div
        role="img"
        aria-label={`${avatar.label} avatar`}
        className="flex size-16 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-3xl"
      >
        {avatar.symbol}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          to={`/users/${profile.username}`}
          className="break-words text-lg font-semibold hover:text-violet-300"
        >
          {profile.displayName}
        </Link>

        <p className="mt-1 break-all text-sm text-zinc-400">
          @{profile.username}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {kind === 'incoming' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept(profile.userId)}
              className={PRIMARY_BUTTON}
            >
              Accept
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline(profile.userId)}
              className={SECONDARY_BUTTON}
            >
              Decline
            </button>
          </>
        )}

        {kind === 'outgoing' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel(profile.userId)}
            className={SECONDARY_BUTTON}
          >
            Cancel request
          </button>
        )}

        {kind === 'friend' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(profile.userId)}
            className={SECONDARY_BUTTON}
          >
            Remove friend
          </button>
        )}
      </div>
    </article>
  )
}

function SocialSection({
  title,
  description,
  entries,
  emptyMessage,
  kind,
  busyUserId,
  ...actions
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          {description}
        </p>
      </div>

      {entries.length ? (
        <div className="mt-5 space-y-3">
          {entries.map((entry) => (
            <SocialUserCard
              key={entry.friendship.id}
              entry={entry}
              kind={kind}
              busy={
                busyUserId
                === entry.profile.userId
              }
              {...actions}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-zinc-500">
          {emptyMessage}
        </p>
      )}
    </section>
  )
}

export default function FriendsPage() {
  const {
    loading,
    graph,
    error,
    actionError,
    busyUserId,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
  } = useSocialGraph()

  if (loading) {
    return (
      <div className="w-full self-start">
        <p role="status" className="text-zinc-400">
          Loading friends…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <section className="w-full self-start rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-2xl font-semibold">
          Friends unavailable
        </h1>

        <p role="alert" className="mt-2 text-zinc-400">
          We couldn't load your social graph right now.
        </p>
      </section>
    )
  }

  return (
    <section
      className="w-full min-w-0 self-start space-y-6"
      aria-labelledby="friends-title"
    >
      <div className="space-y-2">
        <h1
          id="friends-title"
          className="text-3xl font-semibold tracking-tight"
        >
          Friends
        </h1>

        <p className="max-w-2xl text-sm text-zinc-400">
          Manage your MovieDNA friends and friend requests.
        </p>
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300"
        >
          The friendship action could not be completed.
        </p>
      )}

      <SocialSection
        title={`Friends (${graph.friends.length})`}
        description="People you've connected with on MovieDNA."
        entries={graph.friends}
        emptyMessage="You haven't added any friends yet."
        kind="friend"
        busyUserId={busyUserId}
        onRemove={removeFriend}
      />

      <SocialSection
        title={`Incoming requests (${graph.incoming.length})`}
        description="People who want to add you as a friend."
        entries={graph.incoming}
        emptyMessage="No incoming friend requests."
        kind="incoming"
        busyUserId={busyUserId}
        onAccept={acceptRequest}
        onDecline={declineRequest}
      />

      <SocialSection
        title={`Sent requests (${graph.outgoing.length})`}
        description="Friend requests waiting for a response."
        entries={graph.outgoing}
        emptyMessage="No pending sent requests."
        kind="outgoing"
        busyUserId={busyUserId}
        onCancel={cancelRequest}
      />
    </section>
  )
}
