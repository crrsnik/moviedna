import {
  useId,
  useState,
} from 'react'

import { useAuth } from '../../auth/hooks/useAuth.js'
import { useUserProfile } from '../../profile/hooks/useUserProfile.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

import {
  getMediaKey,
} from '../../library/validation/libraryValidation.js'

import {
  detailToViewingSnapshot,
} from '../../viewingHistory/validation/viewingHistoryValidation.js'

import {
  libraryButton,
} from '../../library/components/LibraryDialog.jsx'

import { useMediaRating } from '../hooks/useMediaRating.js'
import { useRatingAction } from '../hooks/useRatingAction.js'
import { ratingService } from '../services/ratingService.js'

function StarIcon({
  filled = false,
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="block size-8"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 2.9 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
    </svg>
  )
}

function RatingStars({
  id,
  score,
  disabled,
  onChange,
}) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(null)

  const visibleScore = (
    hovered ?? score ?? 0
  )

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      onMouseLeave={() => setHovered(null)}
    >
      <div
        className="
          flex flex-wrap gap-1
          rounded-md
          focus-within:outline-2
          focus-within:outline-offset-4
          focus-within:outline-focus
        "
      >
        {Array.from(
          { length: 10 },
          (_, index) => index + 1,
        ).map(value => {
          const active = visibleScore >= value

          return (
            <label
              key={value}
              title={t(
                'ratings.scoreAria',
                { score: value },
              )}
              onMouseEnter={() => (
                setHovered(value)
              )}
              className={[
                'relative cursor-pointer',
                disabled
                  ? 'cursor-not-allowed'
                  : '',
              ].join(' ')}
            >
              <input
                type="radio"
                name={`${id}-score`}
                value={value}
                checked={score === value}
                onChange={() => onChange(value)}
                disabled={disabled}
                aria-label={t(
                  'ratings.scoreAria',
                  { score: value },
                )}
                className="sr-only"
              />

              <span
                className={[
                  'rating-star block',
                  active
                    ? 'text-amber-400'
                    : 'text-tertiary',
                ].join(' ')}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-6 sm:size-7"
                  fill={
                    active
                      ? 'currentColor'
                      : 'none'
                  }
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 2.9 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
                </svg>
              </span>
            </label>
          )
        })}
      </div>

      <span
        className="
          min-w-10 text-sm font-semibold
          tabular-nums text-primary
        "
      >
        {visibleScore
          ? `${visibleScore}/10`
          : '—'}
      </span>
    </div>
  )
}

function RatingControl({
  uid,
  media,
  mediaKey,
}) {
  const { t } = useTranslation()

  const {
    data,
    loading,
    error,
    retry,
  } = useMediaRating(
    uid,
    mediaKey,
  )

  const action = useRatingAction()
  const id = useId()

  const [draft, setDraft] = useState(null)

  const score = (
    draft ?? data?.score ?? null
  )

  return (
    <section
      aria-labelledby={id}
      className="
        min-w-0 space-y-4 rounded-xl
        border border-border bg-surface p-5
      "
    >
      <div className="space-y-1">
        <h2
          id={id}
          className="text-lg font-semibold"
        >
          {t('ratings.yourRating')}
        </h2>

        {!loading && !error && (
          <p className="text-sm text-secondary">
            {data
              ? t(
                'ratings.current',
                { score: data.score },
              )
              : t('ratings.unrated')}
          </p>
        )}
      </div>

      {loading ? (
        <p
          role="status"
          className="text-sm text-secondary"
        >
          {t('ratings.loadingOne')}
        </p>
      ) : error ? (
        <div className="space-y-3">
          <p
            role="alert"
            className="text-sm text-secondary"
          >
            {t('ratings.loadError')}
          </p>

          <button
            type="button"
            className={libraryButton}
            disabled={action.pending}
            onClick={retry}
          >
            {t('ratings.retryOne')}
          </button>
        </div>
      ) : (
        <>
          <fieldset
            disabled={action.pending}
            className="space-y-2"
          >
            <legend className="sr-only">
              {t('ratings.choose')}
            </legend>

            <RatingStars
              id={id}
              score={score}
              disabled={action.pending}
              onChange={setDraft}
            />
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                action.pending
                || score === null
                || score === data?.score
              }
              onClick={() => (
                action.run(
                  'save',
                  () => (
                    ratingService
                      .saveRating(
                        uid,
                        media,
                        score,
                      )
                  ),
                  () => setDraft(null),
                )
              )}
              className="
                rounded-lg bg-primary px-4 py-2
                text-sm font-semibold text-app
                transition-opacity hover:opacity-85
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-focus
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {action.pending
                && action.operation === 'save'
                ? t('ratings.saving')
                : t('ratings.save')}
            </button>

            {data && (
              <button
                type="button"
                className={libraryButton}
                disabled={action.pending}
                onClick={() => (
                  action.run(
                    'remove',
                    () => (
                      ratingService
                        .deleteRating(
                          uid,
                          mediaKey,
                        )
                    ),
                    () => setDraft(null),
                  )
                )}
              >
                {action.pending
                  && action.operation === 'remove'
                  ? t(
                    'ratings.removing',
                  )
                  : t(
                    'ratings.remove',
                  )}
              </button>
            )}
          </div>
        </>
      )}

      {action.error && (
        <p
          role="alert"
          className="text-sm text-secondary"
        >
          {t('ratings.error')}
        </p>
      )}
    </section>
  )
}

export default function MediaRatingControl({
  mediaType,
  detail,
}) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const {
    profile,
    isProfileLoading,
    profileError,
    hasCompletedOnboarding,
  } = useUserProfile()

  if (
    !user
    || !profile
    || isProfileLoading
    || profileError
    || !hasCompletedOnboarding
  ) {
    return null
  }

  let media
  let mediaKey

  try {
    media = detailToViewingSnapshot(
      mediaType,
      detail,
    )

    mediaKey = getMediaKey(
      mediaType,
      media.tmdbId,
    )
  } catch {
    return (
      <p role="alert">
        {t('ratings.cannotRate')}
      </p>
    )
  }

  return (
    <RatingControl
      key={`${user.uid}:${mediaKey}`}
      uid={user.uid}
      media={media}
      mediaKey={mediaKey}
    />
  )
}
