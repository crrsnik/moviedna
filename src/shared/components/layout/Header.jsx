import { useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/hooks/useAuth.js'

const linkClasses = 'rounded-md px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 [&.active]:bg-zinc-800 [&.active]:text-white [&.active]:underline [&.active]:underline-offset-4'

function Header() {
  const { user, isAuthenticated, logout, registrationStatus } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(null)
  const logoutPending = useRef(false)

  async function handleLogout() {
    if (logoutPending.current) return
    logoutPending.current = true
    setIsLoggingOut(true)
    setLogoutError(null)
    try {
      await logout()
      navigate('/')
    } catch {
      setLogoutError("We couldn't log you out. Please try again.")
    } finally {
      logoutPending.current = false
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-4 px-4 py-4 sm:px-6">
        <NavLink
          className="rounded-md text-xl font-bold tracking-tight hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
          to="/"
          end
        >
          MovieDNA
        </NavLink>
        <nav className="order-last flex w-full flex-wrap gap-1 md:order-none md:w-auto" aria-label="Main navigation">
          <NavLink className={linkClasses} to="/movies">Movies</NavLink>
          <NavLink className={linkClasses} to="/tv">TV Shows</NavLink>
          <NavLink className={linkClasses} to="/actors">Actors</NavLink>
        </nav>
        <nav className="ml-auto flex flex-wrap items-center gap-2" aria-label="Account">
          {registrationStatus === 'pending' ? (
            <span role="status" className="text-sm text-zinc-400">Creating account…</span>
          ) : isAuthenticated ? (
            <>
              <NavLink className={linkClasses} to="/library">Library</NavLink>
              <span className="max-w-48 break-words text-sm text-zinc-300">{user.displayName || user.email || 'Account'}</span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`${linkClasses} cursor-pointer disabled:cursor-wait disabled:opacity-60`}
              >
                {isLoggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </>
          ) : (
            <>
          <NavLink className={linkClasses} to="/login">Log in</NavLink>
          <NavLink
            className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 [&.active]:underline [&.active]:underline-offset-4 [&.active]:ring-2 [&.active]:ring-zinc-400 [&.active]:ring-offset-2 [&.active]:ring-offset-zinc-900"
            to="/register"
          >
            Register
          </NavLink>
            </>
          )}
          {logoutError && <p role="alert" className="w-full text-sm text-red-300">{logoutError}</p>}
        </nav>
      </div>
    </header>
  )
}

export default Header
