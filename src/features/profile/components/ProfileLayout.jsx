import {
  Link,
  NavLink,
  Outlet,
} from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import {
  PROFILE_AVATARS,
} from '../constants/profileSettings.js'
import { useUserProfile } from '../hooks/useUserProfile.js'

const tabClasses = ({ isActive }) => [
  'shrink-0 rounded-md px-3 py-2 text-sm font-medium transition',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100',
  isActive
    ? 'bg-zinc-100 text-zinc-950'
    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
].join(' ')

function ProfileLayout() {
  const { t } = useTranslation()

  const {
    profile,
    isProfileLoading,
    profileError,
  } = useUserProfile()

  if (isProfileLoading) {
    return (
      <div className="w-full self-start">
        <p
          role="status"
          className="text-zinc-400"
        >
          {t('profile.loading')}
        </p>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="w-full self-start">
        <p
          role="alert"
          className="text-red-300"
        >
          {t('profile.loadError')}
        </p>
      </div>
    )
  }

  const avatar = PROFILE_AVATARS.find(
    ({ id }) => id === profile.avatarId,
  ) ?? PROFILE_AVATARS[0]

  return (
    <div className="w-full min-w-0 self-start space-y-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="flex size-24 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-5xl"
            aria-label={t(
              'profile.avatar',
              {
                label: t(
                  `profile.avatars.${avatar.id}`,
                ),
              },
            )}
            role="img"
          >
            {avatar.symbol}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl">
                {profile.displayName}
              </h1>

              <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300">
                {profile.profileVisibility === 'public'
                  ? t('profile.publicProfile')
                  : t('profile.privateProfile')}
              </span>
            </div>

            <p className="mt-1 break-all text-zinc-400">
              @{profile.username}
            </p>

            <Link
              to="/profile/settings"
              className="mt-4 inline-flex rounded-md border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100"
            >
              {t('profile.editProfile')}
            </Link>
          </div>
        </div>
      </section>

      <nav
        aria-label={t('profile.navigation')}
        className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-2"
      >
        <NavLink
          end
          className={tabClasses}
          to="/profile"
        >
          {t('profile.overview')}
        </NavLink>

        <NavLink
          className={tabClasses}
          to="/profile/library"
        >
          {t('profile.library')}
        </NavLink>

        <NavLink
          className={tabClasses}
          to="/profile/dna"
        >
          {t('profile.dna')}
        </NavLink>

        <NavLink
          className={tabClasses}
          to="/profile/history"
        >
          {t('profile.history')}
        </NavLink>

        <NavLink
          className={tabClasses}
          to="/profile/ratings"
        >
          {t('profile.ratings')}
        </NavLink>

        <NavLink
          className={tabClasses}
          to="/profile/stats"
        >
          {t('profile.statistics')}
        </NavLink>
      </nav>

      <Outlet />
    </div>
  )
}

export default ProfileLayout
