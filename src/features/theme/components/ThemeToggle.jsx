import { useTheme } from '../context/ThemeContext.jsx'

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2" />
      <path d="M12 19.5v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2.5 12h2" />
      <path d="M19.5 12h2" />
      <path d="m4.9 19.1 1.4-1.4" />
      <path d="m17.7 6.3 1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" />
    </svg>
  )
}

function ThemeToggle() {
  const {
    resolvedTheme,
    toggleTheme,
  } = useTheme()

  const dark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? 'Use light theme' : 'Use dark theme'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className="
        flex size-9 shrink-0 cursor-pointer items-center justify-center
        rounded-lg border border-border bg-surface
        text-secondary
        transition-colors
        hover:border-border-strong hover:bg-surface-muted hover:text-primary
        focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-focus
      "
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

export default ThemeToggle
