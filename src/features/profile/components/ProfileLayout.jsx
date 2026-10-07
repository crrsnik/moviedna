import {
  Link,
  NavLink,
  Outlet,
} from 'react-router-dom'

import { useMovieDna } from '../../dna/hooks/useMovieDna.js'
import { selectTasteTitle } from '../../dna/utils/selectTasteTitle.js'
import TasteTitleBadge from '../../dna/components/TasteTitleBadge.jsx'
import { useTranslation } from '../../localization/hooks/useTranslation.js'
import {
  PROFILE_AVATARS,
} from '../constants/profileSettings.js'
import { useUserProfile } from '../hooks/useUserProfile.js'

const tabClasses = ({ isActive }) => [
  'shrink-0 rounded-md px-3 py-2 text-sm font-medium transition',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
  isActive
    ? 'bg-accent text-accent-contrast'
    : 'text-secondary hover:bg-surface-muted hover:text-white',
].join(' ')

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  )
}

function ProfileLayout() {
  const { t } = useTranslation()

  const dnaState = useMovieDna()

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
          className="text-secondary"
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

  const tasteTitle = selectTasteTitle(
    dnaState.current?.dimensions,
  )

  const avatar = PROFILE_AVATARS.find(
    ({ id }) => id === profile.avatarId,
  ) ?? PROFILE_AVATARS[0]

  return (
    <div className="w-full min-w-0 self-start space-y-8">
      <section className="relative rounded-2xl border border-border bg-surface p-5 sm:p-7">
        {/* Mobile settings shortcut */}
        <Link
          to="/profile/settings"
          aria-label={t('profile.editProfile')}
          title={t('profile.editProfile')}
          className="
            absolute right-4 top-4
            inline-flex size-10 items-center justify-center
            rounded-full border border-border-strong
            bg-surface text-secondary
            transition-colors
            hover:bg-surface-muted hover:text-primary
            focus-visible:outline-2
            focus-visible:outline-offset-2
            focus-visible:outline-focus
            sm:hidden
          "
        >
          <SettingsIcon />
        </Link>

        <div
          className="
            flex flex-col items-center gap-4 text-center
            sm:flex-row sm:items-center sm:gap-5 sm:text-left
          "
        >
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div
              className="
                flex size-28 items-center justify-center
                rounded-full border border-border
                bg-surface-muted text-6xl
                sm:size-24 sm:text-5xl
              "
              aria-label={t(
                'profile.avatar',
                {
                  label: avatar.label,
                },
              )}
              role="img"
            >
              {avatar.symbol}
            </div>

            <div
              className="
                flex flex-col items-center
                gap-1.5 sm:hidden
              "
            >
              {tasteTitle && (
                <TasteTitleBadge
                  title={tasteTitle}
                  className="sm:hidden"
                />
              )}

            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="
                flex flex-col items-center gap-2
                sm:flex-row sm:flex-wrap
                sm:items-center sm:gap-4
              "
            >
              <h1
                className="
                  break-words text-3xl font-bold tracking-tight
                  sm:text-4xl
                "
              >
                {profile.displayName}
              </h1>

              {tasteTitle && (
                <TasteTitleBadge
                  title={tasteTitle}
                  className="hidden sm:inline-flex"
                />
              )}
            </div>

            <p className="mt-1 break-all text-secondary">
              @{profile.username}
            </p>

            {/* Original desktop edit button */}
            <Link
              to="/profile/settings"
              className="
                mt-4 hidden rounded-md
                border border-border-strong
                px-3 py-2 text-sm font-medium
                text-primary
                hover:bg-surface-muted
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-focus
                sm:inline-flex
              "
            >
              {t('profile.editProfile')}
            </Link>
          </div>
        </div>
      </section>

      <nav
        aria-label={t('profile.navigation')}
        className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-2"
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
