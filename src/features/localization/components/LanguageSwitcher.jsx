import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useTranslation,
} from '../hooks/useTranslation.js'

export default function LanguageSwitcher() {
  const {
    locale,
    setLocale,
    supportedLocales,
    t,
  } = useTranslation()

  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

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

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('language.label')}
        title={t('language.label')}
        onClick={() => setOpen(value => !value)}
        className="
          flex size-9 cursor-pointer items-center justify-center
          rounded-full border border-border bg-surface
          text-[11px] font-bold uppercase tracking-wide text-primary
          transition-colors
          hover:border-border-strong hover:bg-surface-muted
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-focus
        "
      >
        {locale.slice(0, 2)}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('language.label')}
          className="
            absolute right-0 z-50 mt-2 min-w-36
            rounded-xl border border-border bg-surface p-1.5
            text-primary shadow-[var(--app-shadow-md)]
          "
        >
          {supportedLocales.map(
            supportedLocale => {
              const selected = (
                supportedLocale === locale
              )

              return (
                <button
                  key={supportedLocale}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    setLocale(supportedLocale)
                    setOpen(false)
                  }}
                  className={[
                    'flex w-full cursor-pointer items-center',
                    'justify-between gap-4 rounded-lg px-3 py-2',
                    'text-left text-sm transition-colors',
                    'focus-visible:outline-2',
                    'focus-visible:outline-focus',
                    selected
                      ? 'bg-surface-muted font-semibold text-primary'
                      : 'text-secondary hover:bg-surface-muted hover:text-primary',
                  ].join(' ')}
                >
                  <span>
                    {supportedLocale.toUpperCase()}
                  </span>

                  {selected && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  )}
                </button>
              )
            },
          )}
        </div>
      )}
    </div>
  )
}
