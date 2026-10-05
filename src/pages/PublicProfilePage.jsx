import { Navigate, useParams } from 'react-router-dom'

import { useAuth } from '../features/auth/hooks/useAuth.js'
import AchievementsSection from '../features/achievements/components/AchievementsSection.jsx'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'
import FriendshipControls from '../features/friends/components/FriendshipControls.jsx'
import { useFriendship } from '../features/friends/hooks/useFriendship.js'

import { PROFILE_AVATARS } from '../features/profile/constants/profileSettings.js'
import { usePublicProfile } from '../features/profile/hooks/usePublicProfile.js'
import { usePublicProfilePreview } from '../features/profile/hooks/usePublicProfilePreview.js'
import { usePublicBoards } from '../features/profile/hooks/usePublicBoards.js'
import PublicBoards from '../features/profile/components/PublicBoards.jsx'

function MessagePanel({ title, children }) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {title}
      </h1>

      {children && (
        <p className="mt-3 text-secondary">
          {children}
        </p>
      )}
    </section>
  )
}

function ProfileIdentity({ profile }) {
  const { t } = useTranslation()

  const avatar = PROFILE_AVATARS.find(
    ({ id }) => id === profile.avatarId,
  ) ?? PROFILE_AVATARS[0]

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
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
          className="flex size-28 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-6xl"
        >
          {avatar.symbol}
        </div>

        <div className="min-w-0">
          <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl">
            {profile.displayName}
          </h1>

          <p className="mt-2 break-all text-secondary">
            @{profile.username}
          </p>
        </div>
      </div>
    </section>
  )
}

function GenrePreview({ genres }) {
  const { t } = useTranslation()

  if (!genres.length) {
    return (
      <p className="text-sm text-secondary">
        {t('profile.public.dnaEmpty')}
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {genres.map((genre) => {
        const percentage = Math.round(genre.score * 100)

        return (
          <article
            key={genre.label}
            className="rounded-xl border border-border bg-surface-muted p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <strong className="break-words">
                {genre.label}
              </strong>

              <span className="text-sm text-secondary">
                +{percentage}%
              </span>
            </div>

            <progress
              aria-label={t(
                'profile.public.dnaCompatibility',
                {
                  label: genre.label,
                },
              )}
              value={percentage}
              max="100"
              className="mt-3 h-2 w-full accent-violet-400"
            />
          </article>
        )
      })}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <p className="text-sm text-secondary">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold">
        {value}
      </p>
    </div>
  )
}

function PublicPreview({
  state,
  boardsState,
  username,
}) {
  const { t } = useTranslation()

  if (state.loading) {
    return (
      <p role="status" className="text-secondary">
        {t('profile.public.previewLoading')}
      </p>
    )
  }

  if (state.error) {
    return (
      <p role="alert" className="text-secondary">
        {t('profile.public.previewError')}
      </p>
    )
  }

  if (!state.preview) {
    return (
      <p className="text-secondary">
        {t('profile.public.previewMissing')}
      </p>
    )
  }

  const {
    dna,
    statistics,
    achievements,
  } = state.preview

  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{t('profile.public.dnaTitle')}</h2>

          <p className="text-sm text-secondary">
            {t('profile.public.dnaDescription')}
          </p>
        </div>

        <div className="mt-5">
          <GenrePreview genres={dna.genres} />
        </div>
      </section>

      <AchievementsSection
        publicView
        state={{
          loading: false,
          error: null,
          data: achievements,
        }}
      />

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{t('profile.public.statisticsTitle')}</h2>

          <p className="text-sm text-secondary">
            {t('profile.public.statisticsDescription')}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            label={t('profile.public.watched')}
            value={statistics.totalViewings}
          />

          <Stat
            label={t('profile.public.movies')}
            value={statistics.movieCount}
          />

          <Stat
            label={t('profile.public.tvShows')}
            value={statistics.tvCount}
          />
        </div>
      </section>

      <PublicBoards
        state={boardsState}
        username={username}
      />
    </>
  )
}

export default function PublicProfilePage() {
  const { t } = useTranslation()
  const { username = '' } = useParams()
  const { user } = useAuth()

  const {
    loading,
    result,
    error,
  } = usePublicProfile(username)

  const ownProfile = (
    result?.profile?.userId
    && result.profile.userId === user?.uid
  )

  const targetUserId = (
    result?.profile?.userId
    && !ownProfile
  )
    ? result.profile.userId
    : null

  const friendshipState = useFriendship(
    targetUserId,
  )

  const canViewPreview = (
    result?.kind === 'public'
    || friendshipState.status === 'friends'
  )

  const previewUid = (
    result?.profile
    && !ownProfile
    && canViewPreview
  )
    ? result.profile.userId
    : null

  const previewState = usePublicProfilePreview(previewUid)
  const boardsState = usePublicBoards(previewUid)

  if (loading) {
    return (
      <div className="w-full self-start">
        <p role="status" className="text-secondary">
          {t('profile.public.loading')}
        </p>
      </div>
    )
  }

  if (error) {
    if (error.code === 'public-profile/invalid-username') {
      return (
        <MessagePanel
          title={t(
            'profile.public.notFoundTitle',
          )}
        >
          {t(
            'profile.public.notFoundDescription',
          )}
        </MessagePanel>
      )
    }

    return (
      <MessagePanel
        title={t(
          'profile.public.unavailableTitle',
        )}
      >
        {t(
          'profile.public.unavailableDescription',
        )}
      </MessagePanel>
    )
  }

  if (
    result?.kind === 'not-found'
    || !result?.profile
  ) {
    return (
      <MessagePanel
          title={t(
            'profile.public.notFoundTitle',
          )}
        >
          {t(
            'profile.public.notFoundDescription',
          )}
        </MessagePanel>
    )
  }

  if (ownProfile) {
    return <Navigate to="/profile" replace />
  }

  const { profile } = result

  return (
    <div className="w-full min-w-0 max-w-4xl self-start space-y-6">
      <ProfileIdentity profile={profile} />

      <section className="rounded-2xl border border-border bg-surface p-6">
        <FriendshipControls
          targetUserId={profile.userId}
          friendshipState={friendshipState}
        />
      </section>

      {result.kind === 'private'
        && friendshipState.loading ? (
        <section className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p role="status" className="text-secondary">
            {t('profile.public.checkingAccess')}
          </p>
        </section>
      ) : result.kind === 'private'
        && friendshipState.status !== 'friends' ? (
        <section className="rounded-2xl border border-border bg-surface p-8 text-center">
          <div
            aria-hidden="true"
            className="text-3xl"
          >
            🔒
          </div>

          <h2 className="mt-3 text-xl font-semibold">{t('profile.public.privateTitle')}</h2>

          <p className="mx-auto mt-2 max-w-lg text-sm text-secondary">
            {t('profile.public.privateDescription')}
          </p>
        </section>
      ) : (
        <PublicPreview
          state={previewState}
          boardsState={boardsState}
          username={username}
        />
      )}
    </div>
  )
}
