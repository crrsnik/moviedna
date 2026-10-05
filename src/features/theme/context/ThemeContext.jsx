import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const STORAGE_KEY = 'moviedna-theme'
const VALID_THEMES = new Set(['light', 'dark', 'system'])

const ThemeContext = createContext(null)

function getStoredTheme() {
  if (typeof window === 'undefined') return 'system'

  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return VALID_THEMES.has(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark'

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyResolvedTheme(theme) {
  if (typeof document === 'undefined') return

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = event => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const resolvedTheme = theme === 'system'
    ? systemTheme
    : theme

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Theme still works for the current session if storage is unavailable.
    }
  }, [resolvedTheme, theme])

  const setTheme = nextTheme => {
    if (!VALID_THEMES.has(nextTheme)) return
    setThemeState(nextTheme)
  }

  const toggleTheme = () => {
    setThemeState(currentTheme => {
      const currentResolved = currentTheme === 'system'
        ? getSystemTheme()
        : currentTheme

      return currentResolved === 'dark' ? 'light' : 'dark'
    })
  }

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme],
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }

  return context
}
