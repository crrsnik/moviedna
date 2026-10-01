import { useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../../../features/auth/hooks/useAuth.js'
import { useIncomingFriendRequestCount } from '../../../features/friends/hooks/useIncomingFriendRequestCount.js'
import LanguageSwitcher from '../../../features/localization/components/LanguageSwitcher.jsx'
import { useTranslation } from '../../../features/localization/hooks/useTranslation.js'

const linkClasses = 'rounded-md py-2 font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 [&.active]:bg-zinc-800 [&.active]:text-white [&.active]:underline [&.active]:underline-offset-4'
const navigationLinkClasses = `${linkClasses} px-2 text-xs sm:px-3 sm:text-sm`
const accountActionClasses = `${linkClasses} px-2 text-xs sm:px-3 sm:text-sm`

function Header() {
  const { t } = useTranslation()
  const {
    user,
    isAuthenticated,
    logout,
    registrationStatus,
  } = useAuth()

  const incomingFriendRequestCount =
    useIncomingFriendRequestCount()

  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] =
    useState(false)
  const [logoutError, setLogoutError] =
    useState(null)
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
      setLogoutError(true)
    } finally {
      logoutPending.current = false
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6 md:flex md:gap-x-6 md:gap-y-0 md:py-4">
        <NavLink
          className="rounded-md text-xl font-bold tracking-tight hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
          to="/"
          end
        >
          MovieDNA
        </NavLink>

        <nav
          className="order-last col-span-2 flex w-full min-w-0 items-center justify-start gap-1 overflow-x-auto whitespace-nowrap md:order-none md:col-auto md:w-auto md:overflow-visible"
          aria-label={t('nav.mainNavigation')}
        >
          <NavLink
            className={navigationLinkClasses}
            to="/movies"
          >
            {t('nav.movies')}
          </NavLink>

          <NavLink
            className={navigationLinkClasses}
            to="/tv"
          >
            {t('nav.tvShows')}
          </NavLink>

          <NavLink
            className={navigationLinkClasses}
            to="/actors"
          >
            {t('nav.actors')}
          </NavLink>

          {isAuthenticated && (
            <NavLink
              className={navigationLinkClasses}
              to="/users/search"
            >
              {t('nav.users')}
            </NavLink>
          )}

          {isAuthenticated && (
            <NavLink
              className={`${navigationLinkClasses} inline-flex items-center gap-1.5`}
              to="/friends"
            >
              {t('nav.friends')}

              {incomingFriendRequestCount > 0 && (
                <span
                  aria-label={t(
                    'nav.incomingFriendRequests',
                    {
                      count:
                        incomingFriendRequestCount,
                    },
                  )}
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                >
                  {incomingFriendRequestCount > 99
                    ? '99+'
                    : incomingFriendRequestCount}
                </span>
              )}
            </NavLink>
          )}

          {isAuthenticated && (
            <NavLink
              className={navigationLinkClasses}
              to="/profile"
            >
              {t('nav.profile')}
            </NavLink>
          )}
        </nav>

        <nav
          className="ml-auto flex min-w-0 items-center justify-end gap-1 sm:gap-2"
          aria-label={t('nav.accountNavigation')}
        >
          <LanguageSwitcher />

          {registrationStatus === 'pending' ? (
            <span
              role="status"
              className="text-sm text-zinc-400"
            >
              {t('nav.creatingAccount')}
            </span>
          ) : isAuthenticated ? (
            <>
              <span className="sr-only md:not-sr-only md:max-w-48 md:truncate md:text-sm md:text-zinc-300">
                {t('nav.account', {
                  value:
                    user.email
                    || user.displayName
                    || t('nav.accountNavigation'),
                })}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`${accountActionClasses} cursor-pointer disabled:cursor-wait disabled:opacity-60`}
              >
                {isLoggingOut
                  ? t('nav.loggingOut')
                  : t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <NavLink
                className={accountActionClasses}
                to="/login"
              >
                {t('nav.login')}
              </NavLink>

              <NavLink
                className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 [&.active]:underline [&.active]:underline-offset-4 [&.active]:ring-2 [&.active]:ring-zinc-400 [&.active]:ring-offset-2 [&.active]:ring-offset-zinc-900"
                to="/register"
              >
                {t('nav.register')}
              </NavLink>
            </>
          )}

          {logoutError && (
            <p
              role="alert"
              className="w-full text-sm text-red-300"
            >
              {t('nav.logoutError')}
            </p>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
