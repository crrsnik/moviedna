import { useState } from 'react'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import {
  libraryButton,
} from '../../library/components/LibraryDialog.jsx'

export default function CommentCard({ comment }) {
  const { t, locale } = useTranslation()
  const [revealed, setRevealed] = useState(false)

  const { updatedAt, createdAt } = comment

  const edited = (
    updatedAt.seconds > createdAt.seconds
    || (
      updatedAt.seconds === createdAt.seconds
      && updatedAt.nanoseconds > createdAt.nanoseconds
    )
  )

  const date = new Date(
    updatedAt.seconds * 1000,
  ).toISOString()

  return (
    <article className="min-w-0 space-y-3 rounded-xl border border-border p-4">
      <p className="break-words font-semibold">
        {comment.authorDisplayName}{' '}
        <span className="font-normal text-secondary">
          @{comment.authorUsername}
        </span>
      </p>

      <p className="text-sm text-secondary">
        <time dateTime={date}>
          {new Date(date).toLocaleDateString(
            locale,
          )}
        </time>

        {edited && (
          <>
            {' · '}
            {t('comments.edited')}
          </>
        )}
      </p>

      {comment.containsSpoiler && (
        <p className="text-sm text-amber-300">
          {t('comments.spoilerWarning')}
        </p>
      )}

      {comment.containsSpoiler && !revealed ? (
        <button
          type="button"
          className={libraryButton}
          aria-expanded={false}
          onClick={() => setRevealed(true)}
        >
          {t('comments.showSpoiler')}
        </button>
      ) : (
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {comment.text}
        </p>
      )}
    </article>
  )
}
