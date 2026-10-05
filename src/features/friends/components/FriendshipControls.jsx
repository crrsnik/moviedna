import { useTranslation } from '../../localization/hooks/useTranslation.js'

const PRIMARY_BUTTON = (
  'rounded-lg bg-violet-500 px-4 py-2 '
  + 'text-sm font-semibold text-white '
  + 'transition hover:bg-violet-400 '
  + 'disabled:cursor-not-allowed '
  + 'disabled:opacity-50'
)

const SECONDARY_BUTTON = (
  'rounded-lg border border-border '
  + 'bg-surface-muted px-4 py-2 text-sm '
  + 'font-medium text-primary transition '
  + 'hover:border-border-strong hover:bg-surface-muted '
  + 'disabled:cursor-not-allowed '
  + 'disabled:opacity-50'
)

export default function FriendshipControls({
  targetUserId,
  friendshipState,
}) {
  const { t } = useTranslation()

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
  } = friendshipState

  if (!targetUserId) return null

  if (loading) {
    return (
      <p
        role="status"
        className="text-sm text-secondary"
      >
        {t('social.friendship.loading')}
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
        {busy ? t('social.friendship.sending') : t('social.friendship.addFriend')}
      </button>
    )
  } else if (status === 'outgoing-pending') {
    controls = (
      <>
        <span className="text-sm font-medium text-secondary">
          {t('social.friendship.requestSent')}
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={cancelRequest}
          className={SECONDARY_BUTTON}
        >
          {t('social.friends.cancelRequest')}
        </button>
      </>
    )
  } else if (status === 'incoming-pending') {
    controls = (
      <>
        <span className="text-sm font-medium text-secondary">
          {t('social.friendship.requestReceived')}
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={acceptRequest}
          className={PRIMARY_BUTTON}
        >
          {t('social.friends.accept')}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={declineRequest}
          className={SECONDARY_BUTTON}
        >
          {t('social.friends.decline')}
        </button>
      </>
    )
  } else {
    controls = (
      <>
        <span className="text-sm font-medium text-emerald-300">
          {t('social.friendship.friends')}
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={removeFriend}
          className={SECONDARY_BUTTON}
        >
          {t('social.friends.removeFriend')}
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
          {t('social.friendship.actionError')}
        </p>
      )}
    </div>
  )
}
