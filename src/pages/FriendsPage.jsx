import { Link } from 'react-router-dom'

import { useTranslation } from '../features/localization/hooks/useTranslation.js'

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
  const { t } = useTranslation()

  const { profile } = entry

  const avatar = PROFILE_AVATARS.find(
    ({ id }) => id === profile.avatarId,
  ) ?? PROFILE_AVATARS[0]

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:flex-row sm:items-center">
      <div
        role="img"
        aria-label={t(
          'profile.avatar',
          {
            label: t(
              `profile.avatars.${avatar.id}`,
            ),
          },
        )}
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
            >{t('social.friends.accept')}</button>

            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline(profile.userId)}
              className={SECONDARY_BUTTON}
            >{t('social.friends.decline')}</button>
          </>
        )}

        {kind === 'outgoing' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel(profile.userId)}
            className={SECONDARY_BUTTON}
          >{t('social.friends.cancelRequest')}</button>
        )}

        {kind === 'friend' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(profile.userId)}
            className={SECONDARY_BUTTON}
          >{t('social.friends.removeFriend')}</button>
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
  const { t } = useTranslation()

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
          {t('social.friends.loading')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <section className="w-full self-start rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-2xl font-semibold">
          {t('social.friends.unavailableTitle')}
        </h1>

        <p role="alert" className="mt-2 text-zinc-400">
          {t('social.friends.unavailableDescription')}
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
          {t('social.friends.title')}
        </h1>

        <p className="max-w-2xl text-sm text-zinc-400">
          {t('social.friends.description')}
        </p>
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300"
        >
          {t('social.friends.actionError')}
        </p>
      )}

      <SocialSection
        title={t(
          'social.friends.friendsTitle',
          { count: graph.friends.length },
        )}
        description={t('social.friends.friendsDescription')}
        entries={graph.friends}
        emptyMessage={t('social.friends.friendsEmpty')}
        kind="friend"
        busyUserId={busyUserId}
        onRemove={removeFriend}
      />

      <SocialSection
        title={t(
          'social.friends.incomingTitle',
          { count: graph.incoming.length },
        )}
        description={t('social.friends.incomingDescription')}
        entries={graph.incoming}
        emptyMessage={t('social.friends.incomingEmpty')}
        kind="incoming"
        busyUserId={busyUserId}
        onAccept={acceptRequest}
        onDecline={declineRequest}
      />

      <SocialSection
        title={t(
          'social.friends.outgoingTitle',
          { count: graph.outgoing.length },
        )}
        description={t('social.friends.outgoingDescription')}
        entries={graph.outgoing}
        emptyMessage={t('social.friends.outgoingEmpty')}
        kind="outgoing"
        busyUserId={busyUserId}
        onCancel={cancelRequest}
      />
    </section>
  )
}
