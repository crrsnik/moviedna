import { useParams } from 'react-router-dom'

import { PROFILE_AVATARS } from '../features/profile/constants/profileSettings.js'
import { usePublicProfile } from '../features/profile/hooks/usePublicProfile.js'

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

export default function PublicProfilePage() {
  const { username = '' } = useParams()

  const {
    loading,
    result,
    error,
  } = usePublicProfile(username)

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

  const { profile } = result

  return (
    <div className="w-full min-w-0 max-w-4xl self-start space-y-6">
      <ProfileIdentity profile={profile} />

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
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">
              MovieDNA
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Public MovieDNA highlights will appear here.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">
              Statistics
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Public viewing statistics will appear here.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
