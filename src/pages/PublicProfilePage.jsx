import { Navigate, useParams } from 'react-router-dom'

import { useAuth } from '../features/auth/hooks/useAuth.js'
import FriendshipControls from '../features/friends/components/FriendshipControls.jsx'

import { PROFILE_AVATARS } from '../features/profile/constants/profileSettings.js'
import { usePublicProfile } from '../features/profile/hooks/usePublicProfile.js'
import { usePublicProfilePreview } from '../features/profile/hooks/usePublicProfilePreview.js'

function MessagePanel({ title, children }) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {title}
      </h1>

      {children && (
        <p className="mt-3 text-zinc-400">
          {children}
        </p>
      )}
    </section>
  )
}

function ProfileIdentity({ profile }) {
  const avatar = PROFILE_AVATARS.find(
    ({ id }) => id === profile.avatarId,
  ) ?? PROFILE_AVATARS[0]

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div
          role="img"
          aria-label={`${avatar.label} avatar`}
          className="flex size-28 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-6xl"
        >
          {avatar.symbol}
        </div>

        <div className="min-w-0">
          <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl">
            {profile.displayName}
          </h1>

          <p className="mt-2 break-all text-zinc-400">
            @{profile.username}
          </p>
        </div>
      </div>
    </section>
  )
}

function GenrePreview({ genres }) {
  if (!genres.length) {
    return (
      <p className="text-sm text-zinc-400">
        Not enough MovieDNA evidence yet.
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
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <strong className="break-words">
                {genre.label}
              </strong>

              <span className="text-sm text-zinc-300">
                +{percentage}%
              </span>
            </div>

            <progress
              aria-label={`${genre.label} MovieDNA compatibility`}
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-sm text-zinc-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold">
        {value}
      </p>
    </div>
  )
}

function PublicPreview({ state }) {
  if (state.loading) {
    return (
      <p role="status" className="text-zinc-400">
        Loading public profile preview…
      </p>
    )
  }

  if (state.error) {
    return (
      <p role="alert" className="text-zinc-400">
        Public profile details could not be loaded.
      </p>
    )
  }

  if (!state.preview) {
    return (
      <p className="text-zinc-400">
        This profile doesn't have a public preview yet.
      </p>
    )
  }

  const { dna, statistics } = state.preview

  return (
    <>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">
            MovieDNA
          </h2>

          <p className="text-sm text-zinc-400">
            Strongest positive genre signals.
          </p>
        </div>

        <div className="mt-5">
          <GenrePreview genres={dna.genres} />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">
            Statistics
          </h2>

          <p className="text-sm text-zinc-400">
            Public viewing totals.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Watched"
            value={statistics.totalViewings}
          />

          <Stat
            label="Movies"
            value={statistics.movieCount}
          />

          <Stat
            label="TV shows"
            value={statistics.tvCount}
          />
        </div>
      </section>
    </>
  )
}

export default function PublicProfilePage() {
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

  const previewUid = (
    result?.kind === 'public'
    && result.profile
    && !ownProfile
  )
    ? result.profile.userId
    : null

  const previewState = usePublicProfilePreview(previewUid)

  if (loading) {
    return (
      <div className="w-full self-start">
        <p role="status" className="text-zinc-400">
          Loading profile…
        </p>
      </div>
    )
  }

  if (error) {
    if (error.code === 'public-profile/invalid-username') {
      return (
        <MessagePanel title="Profile not found">
          This user doesn't exist.
        </MessagePanel>
      )
    }

    return (
      <MessagePanel title="Profile unavailable">
        We couldn't load this profile right now.
      </MessagePanel>
    )
  }

  if (
    result?.kind === 'not-found'
    || !result?.profile
  ) {
    return (
      <MessagePanel title="Profile not found">
        This user doesn't exist.
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

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <FriendshipControls
          targetUserId={profile.userId}
        />
      </section>

      {result.kind === 'private' ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div
            aria-hidden="true"
            className="text-3xl"
          >
            🔒
          </div>

          <h2 className="mt-3 text-xl font-semibold">
            This account is private
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-400">
            This user's MovieDNA and statistics are private.
          </p>
        </section>
      ) : (
        <PublicPreview state={previewState} />
      )}
    </div>
  )
}
