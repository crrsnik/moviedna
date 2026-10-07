import {
  Link,
  Navigate,
  useParams,
} from 'react-router-dom'

import { useAuth } from '../features/auth/hooks/useAuth.js'
import DetailImage from '../features/catalog/components/DetailImage.jsx'
import { getTmdbPosterUrl } from '../features/catalog/services/tmdbImages.js'
import { useFriendship } from '../features/friends/hooks/useFriendship.js'
import { savedMediaRoute } from '../features/library/validation/libraryValidation.js'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'
import { usePublicBoards } from '../features/profile/hooks/usePublicBoards.js'
import { usePublicProfile } from '../features/profile/hooks/usePublicProfile.js'

function MessagePanel({
  title,
  children,
  role,
}) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {title}
      </h1>

      {children && (
        <p
          role={role}
          className="mt-3 text-secondary"
        >
          {children}
        </p>
      )}
    </section>
  )
}

function BoardItems({ items }) {
  const { t } = useTranslation()

  if (!items.length) {
    return (
      <p className="text-sm text-secondary">
        {t('library.boards.emptyBoard')}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map(item => (
        <article
          key={item.key}
          className="min-w-0"
        >
          <Link
            to={savedMediaRoute(item)}
            className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            <DetailImage
              src={getTmdbPosterUrl(
                item.posterPath,
              )}
              alt={t(
                'catalog.media.posterAlt',
                { title: item.title },
              )}
              placeholder={t(
                'catalog.media.noPoster',
              )}
              className="aspect-2/3 rounded-lg"
            />

            <h2
              className="
                mt-2 line-clamp-2 min-h-12
                break-words font-medium leading-6
              "
              title={item.title}
            >
              {item.title}
            </h2>

            <p className="mt-1 truncate text-sm text-secondary">
              {[
                item.mediaType === 'movie'
                  ? t('catalog.media.movie')
                  : t('catalog.media.tv'),
                item.releaseYear,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </Link>
        </article>
      ))}
    </div>
  )
}

export default function PublicBoardPage() {
  const {
    username,
    boardId,
  } = useParams()

  const { user } = useAuth()
  const { t } = useTranslation()

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

  const canViewBoards = (
    result?.kind === 'public'
    || friendshipState.status === 'friends'
  )

  const boardsUid = (
    result?.profile
    && !ownProfile
    && canViewBoards
  )
    ? result.profile.userId
    : null

  const boardsState = usePublicBoards(
    boardsUid,
  )

  if (loading) {
    return (
      <MessagePanel
        title={t('library.boards.title')}
        role="status"
      >
        {t('profile.public.loading')}
      </MessagePanel>
    )
  }

  if (error) {
    const notFound = (
      error.code
      === 'public-profile/invalid-username'
    )

    return (
      <MessagePanel
        title={t(
          notFound
            ? 'profile.public.notFoundTitle'
            : 'profile.public.unavailableTitle',
        )}
        role="alert"
      >
        {t(
          notFound
            ? 'profile.public.notFoundDescription'
            : 'profile.public.unavailableDescription',
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
    return (
      <Navigate
        to="/profile/library"
        replace
      />
    )
  }

  if (
    result.kind === 'private'
    && friendshipState.loading
  ) {
    return (
      <MessagePanel
        title={t('library.boards.title')}
        role="status"
      >
        {t('profile.public.checkingAccess')}
      </MessagePanel>
    )
  }

  if (
    result.kind === 'private'
    && friendshipState.status !== 'friends'
  ) {
    return (
      <MessagePanel
        title={t(
          'profile.public.privateTitle',
        )}
      >
        {t(
          'profile.public.privateDescription',
        )}
      </MessagePanel>
    )
  }

  if (boardsState.loading) {
    return (
      <MessagePanel
        title={t('library.boards.title')}
        role="status"
      >
        {t('library.boards.loading')}
      </MessagePanel>
    )
  }

  if (boardsState.error) {
    return (
      <MessagePanel
        title={t('library.boards.title')}
        role="alert"
      >
        {t('library.boards.error')}
      </MessagePanel>
    )
  }

  const board = boardsState.boards.find(
    item => item.id === boardId,
  )

  if (!board) {
    return (
      <MessagePanel
        title={t('library.boards.title')}
      >
        {t('library.boards.notFound')}
      </MessagePanel>
    )
  }

  const profileRoute = (
    `/users/${encodeURIComponent(username)}`
  )

  return (
    <div className="w-full min-w-0 max-w-6xl self-start">
      <Link
        to={profileRoute}
        className="inline-flex text-sm font-medium text-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
      >
        ← {t('library.boards.backToProfile')}
      </Link>

      <header className="mt-6">
        <h1 className="break-words text-3xl font-semibold tracking-tight">
          {board.name}
        </h1>

        {board.description && (
          <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-secondary">
            {board.description}
          </p>
        )}

        <p className="mt-2 text-sm text-tertiary">
          {t(
            board.items.length === 1
              ? 'library.boards.oneTitle'
              : 'library.boards.manyTitles',
            {
              count: board.items.length,
            },
          )}
        </p>
      </header>

      <section className="mt-8">
        <BoardItems items={board.items} />
      </section>
    </div>
  )
}
