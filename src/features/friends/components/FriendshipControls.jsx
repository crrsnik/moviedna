import { useFriendship } from '../hooks/useFriendship.js'

const PRIMARY_BUTTON = (
  'rounded-lg bg-violet-500 px-4 py-2 '
  + 'text-sm font-semibold text-white '
  + 'transition hover:bg-violet-400 '
  + 'disabled:cursor-not-allowed '
  + 'disabled:opacity-50'
)

const SECONDARY_BUTTON = (
  'rounded-lg border border-zinc-700 '
  + 'bg-zinc-950 px-4 py-2 text-sm '
  + 'font-medium text-zinc-200 transition '
  + 'hover:border-zinc-600 hover:bg-zinc-800 '
  + 'disabled:cursor-not-allowed '
  + 'disabled:opacity-50'
)

export default function FriendshipControls({
  targetUserId,
}) {
  const {
    loading,
    busy,
    error,
    status,
    sendRequest,
    acceptRequest,
    cancelRequest,
    declineRequest,
    removeFriend,
  } = useFriendship(targetUserId)

  if (!targetUserId) return null

  if (loading) {
    return (
      <p
        role="status"
        className="text-sm text-zinc-400"
      >
        Loading friendship…
      </p>
    )
  }

  let controls

  if (status === 'none') {
    controls = (
      <button
        type="button"
        disabled={busy}
        onClick={sendRequest}
        className={PRIMARY_BUTTON}
      >
        {busy ? 'Sending…' : 'Add friend'}
      </button>
    )
  } else if (status === 'outgoing-pending') {
    controls = (
      <>
        <span className="text-sm font-medium text-zinc-300">
          Request sent
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={cancelRequest}
          className={SECONDARY_BUTTON}
        >
          Cancel request
        </button>
      </>
    )
  } else if (status === 'incoming-pending') {
    controls = (
      <>
        <span className="text-sm font-medium text-zinc-300">
          Friend request received
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={acceptRequest}
          className={PRIMARY_BUTTON}
        >
          Accept
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={declineRequest}
          className={SECONDARY_BUTTON}
        >
          Decline
        </button>
      </>
    )
  } else {
    controls = (
      <>
        <span className="text-sm font-medium text-emerald-300">
          Friends
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={removeFriend}
          className={SECONDARY_BUTTON}
        >
          Remove friend
        </button>
      </>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {controls}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-red-300"
        >
          Friendship action could not be completed.
        </p>
      )}
    </div>
  )
}
