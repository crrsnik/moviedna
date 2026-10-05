import { Link } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import {
  PROFILE_AVATARS,
} from '../constants/profileSettings.js'

export default function UserSearchResult({
  profile,
  currentUserId,
}) {
  const { t } = useTranslation()

  const avatar = PROFILE_AVATARS.find(
    ({ id }) => id === profile.avatarId,
  ) ?? PROFILE_AVATARS[0]

  const ownProfile = profile.userId === currentUserId

  const destination = ownProfile
    ? '/profile'
    : `/users/${profile.username}`

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
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
        className="flex size-20 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-4xl"
      >
        {avatar.symbol}
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="break-words text-xl font-semibold">
          {profile.displayName}
        </h2>

        <p className="mt-1 break-all text-sm text-secondary">
          @{profile.username}
        </p>

        <p className="mt-2 text-xs text-tertiary">
          {ownProfile
            ? t('social.userSearch.yourProfile')
            : profile.profileVisibility === 'public'
              ? t('social.userSearch.publicProfile')
              : t('social.userSearch.privateProfile')}
        </p>
      </div>

      <Link
        to={destination}
        className="shrink-0 rounded-lg border border-border px-4 py-2 text-center text-sm font-medium text-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
      >
        {ownProfile
          ? t('social.userSearch.openProfile')
          : t('social.userSearch.viewProfile')}
      </Link>
    </article>
  )
}
