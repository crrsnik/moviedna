import { createContext, useEffect, useState } from 'react'
import AuthLoadingScreen from '../components/AuthLoadingScreen.jsx'
import { logoutUser, subscribeToAuthState } from '../services/authService.js'

// Context is shared with useAuth; this module also owns its provider.
// oxlint-disable-next-line react/only-export-components
export const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let active = true
    let unsubscribe
    const handleError = () => {
      if (!active) return
      setUser(null)
      setAuthError("We couldn't restore your session. Please refresh the page.")
      setIsAuthLoading(false)
    }

    try {
      unsubscribe = subscribeToAuthState((nextUser) => {
        if (!active) return
        setUser(nextUser)
        setAuthError(null)
        setIsAuthLoading(false)
      }, handleError)
    } catch {
      handleError()
    }

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  const value = {
    user,
    isAuthenticated: user !== null,
    isAuthLoading,
    authError,
    logout: logoutUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {isAuthLoading ? <AuthLoadingScreen /> : authError ? (
        <main className="flex min-h-svh items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100">
          <p role="alert">{authError}</p>
        </main>
      ) : children}
    </AuthContext.Provider>
  )
}
