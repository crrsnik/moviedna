import { useId } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../auth/hooks/useAuth.js'
import {
  libraryButton,
} from '../../library/components/LibraryDialog.jsx'
import { useTranslation } from '../../localization/hooks/useTranslation.js'
import {
  useUserProfile,
} from '../../profile/hooks/useUserProfile.js'
import { useComments } from '../hooks/useComments.js'
import {
  commentIdentity,
  validateCommentProfile,
} from '../validation/commentValidation.js'
import CommentCard from './CommentCard.jsx'
import CommentEditor from './CommentEditor.jsx'

function Comments({ media }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const {
    profile,
    isProfileLoading,
    profileError,
  } = useUserProfile()

  const list = useComments(media)
  const id = useId()

  let eligible = false

  if (
    user
    && !isProfileLoading
    && !profileError
  ) {
    try {
      validateCommentProfile(
        user.uid,
        profile,
      )
      eligible = true
    } catch {
      // Read-only public comments remain available.
    }
  }

  return (
    <section
      aria-labelledby={id}
      className="min-w-0 space-y-5"
    >
      <h2
        id={id}
        className="text-2xl font-semibold"
      >
        {t('comments.title')}
      </h2>

      <p className="text-sm text-secondary">
        {t('comments.description')}
      </p>

      {!user ? (
        <p>
          <Link
            to="/login"
            className="underline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {t('comments.login')}
          </Link>{' '}
          {t('comments.loginSuffix')}
        </p>
      ) : eligible ? (
        <CommentEditor
          key={user.uid}
          uid={user.uid}
          profile={profile}
          media={media}
        />
      ) : (
        <p role="status">
          {isProfileLoading
            ? t('comments.profileLoading')
            : t('comments.profileRequired')}
        </p>
      )}

      {list.loading ? (
        <p role="status">
          {t('comments.loading')}
        </p>
      ) : list.error ? (
        <div className="space-y-3">
          <p role="alert">
            {t('comments.actionError')}
          </p>

          <button
            type="button"
            className={libraryButton}
            onClick={list.retry}
          >
            {t('comments.retry')}
          </button>
        </div>
      ) : !list.data.length ? (
        <p>
          {t('comments.empty')}
        </p>
      ) : (
        <div className="space-y-4">
          {list.data.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function MediaComments({
  mediaType,
  tmdbId,
}) {
  let media

  try {
    media = commentIdentity({
      mediaType,
      tmdbId,
    })
  } catch {
    return null
  }

  return (
    <Comments
      key={media.key}
      media={media}
    />
  )
}
