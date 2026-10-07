import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import {
  getTasteTitleSignals,
  TASTE_SIGNAL_LABEL_IDS,
} from '../utils/tasteTitlePresentation.js'

function MedalMark() {
  return (
    <span
      aria-hidden="true"
      className="
        inline-flex size-5 shrink-0
        items-center justify-center
        rounded-full border border-accent
        bg-surface-muted
        text-[10px] font-bold text-primary
      "
    >
      ★
    </span>
  )
}

export default function TasteTitleBadge({
  title,
  className = '',
}) {
  const { t } = useTranslation()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)

  const titleId = title?.id

  const signals = getTasteTitleSignals(
    titleId,
  )

  const titleText = titleId
    ? t(`profile.tasteTitles.${titleId}`)
    : ''

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (
        rootRef.current
        && !rootRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener(
      'pointerdown',
      handlePointerDown,
    )

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown,
      )

      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [open])

  if (!titleId) return null

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex ${className}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t(
          'profile.tasteTitleDetails.openLabel',
          {
            title: titleText,
          },
        )}
        onClick={() => setOpen(value => !value)}
        className="
          inline-flex max-w-44 items-center gap-1.5
          rounded-full border border-accent/70
          bg-surface px-1.5 py-1
          text-[11px] font-semibold text-primary
          shadow-sm transition
          hover:border-accent hover:bg-surface-muted
          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-focus
        "
      >
        <MedalMark />

        <span className="truncate">
          {titleText}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={titleText}
          className="
            absolute left-1/2 top-full z-40
            mt-2 w-72 max-w-[calc(100vw-2rem)]
            -translate-x-1/2
            rounded-xl border border-border-strong
            bg-surface p-4 text-left shadow-xl
            sm:left-auto sm:right-0
            sm:translate-x-0
          "
        >
          <div className="flex items-start gap-3">
            <MedalMark />

            <div className="min-w-0 flex-1">
              <p
                className="
                  text-[10px] font-semibold uppercase
                  tracking-[0.16em] text-tertiary
                "
              >
                {t('profile.tasteTitleLabel')}
              </p>

              <h3 className="mt-0.5 font-semibold text-primary">
                {titleText}
              </h3>
            </div>

            <button
              type="button"
              aria-label={t(
                'profile.tasteTitleDetails.closeLabel',
              )}
              onClick={() => setOpen(false)}
              className="
                inline-flex size-7 shrink-0
                items-center justify-center
                rounded-full text-secondary
                transition hover:bg-surface-muted
                hover:text-primary
                focus-visible:outline-2
                focus-visible:outline-focus
              "
            >
              ×
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-secondary">
            {t(
              signals.length > 1
                ? 'profile.tasteTitleDetails.combinationIntro'
                : 'profile.tasteTitleDetails.singleIntro',
            )}
          </p>

          {signals.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {signals.map(signal => {
                const labelId =
                  TASTE_SIGNAL_LABEL_IDS[signal]

                if (!labelId) return null

                return (
                  <span
                    key={signal}
                    className="
                      rounded-full border
                      border-border-strong
                      bg-surface-muted
                      px-2.5 py-1
                      text-xs font-medium
                      text-primary
                    "
                  >
                    {t(
                      `profile.tasteTitleDetails.signals.${labelId}`,
                    )}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
