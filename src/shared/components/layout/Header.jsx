import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  NavLink,
  useNavigate,
} from 'react-router-dom'

import { useAuth } from '../../../features/auth/hooks/useAuth.js'
import { useIncomingFriendRequestCount } from '../../../features/friends/hooks/useIncomingFriendRequestCount.js'
import LanguageSwitcher from '../../../features/localization/components/LanguageSwitcher.jsx'
import { useTranslation } from '../../../features/localization/hooks/useTranslation.js'
import { PROFILE_AVATARS } from '../../../features/profile/constants/profileSettings.js'
import { useUserProfile } from '../../../features/profile/hooks/useUserProfile.js'

const linkClasses = (
  'rounded-md py-2 font-medium text-zinc-300 '
  + 'hover:bg-zinc-800 hover:text-white '
  + 'focus-visible:outline-2 focus-visible:outline-offset-2 '
  + 'focus-visible:outline-zinc-100 '
  + '[&.active]:bg-zinc-800 [&.active]:text-white '
  + '[&.active]:underline [&.active]:underline-offset-4'
)

const navigationLinkClasses = (
  `${linkClasses} px-2 text-xs sm:px-3 sm:text-sm`
)

const accountActionClasses = (
  `${linkClasses} px-2 text-xs sm:px-3 sm:text-sm`
)

const menuItemClasses = (
  'flex w-full items-center justify-between gap-3 '
  + 'rounded-lg px-3 py-2 text-left text-sm text-zinc-200 '
  + 'hover:bg-zinc-800 hover:text-white '
  + 'focus-visible:outline-2 focus-visible:outline-zinc-100'
)

function Header() {
  const { t } = useTranslation()

  const {
    isAuthenticated,
    logout,
    registrationStatus,
  } = useAuth()

  const { profile } = useUserProfile()

  const incomingFriendRequestCount =
    useIncomingFriendRequestCount()

  const navigate = useNavigate()

  const [isLoggingOut, setIsLoggingOut] =
    useState(false)

  const [logoutError, setLogoutError] =
    useState(null)

  const [menuOpen, setMenuOpen] =
    useState(false)

  const logoutPending = useRef(false)
  const menuRef = useRef(null)

  const avatar = profile
    ? (
        PROFILE_AVATARS.find(
          ({ id }) => id === profile.avatarId,
        ) ?? PROFILE_AVATARS[0]
      )
    : null

  useEffect(() => {
    if (!menuOpen) return undefined

    function handlePointerDown(event) {
      if (
        menuRef.current
        && !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
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
  }, [menuOpen])

  async function handleLogout() {
    if (logoutPending.current) return

    logoutPending.current = true
    setIsLoggingOut(true)
    setLogoutError(null)

    try {
      await logout()
      setMenuOpen(false)
      navigate('/')
    } catch {
      setLogoutError(true)
      setMenuOpen(true)
    } finally {
      logoutPending.current = false
      setIsLoggingOut(false)
    }
  }

  function closeMenu() {
    setMenuOpen(false)
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
            <div
              ref={menuRef}
              className="relative"
            >
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={t('nav.accountNavigation')}
                onClick={() => {
                  setMenuOpen(open => !open)
                  setLogoutError(null)
                }}
                className="relative flex size-10 cursor-pointer items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-xl hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100"
              >
                {avatar ? (
                  <span aria-hidden="true">
                    {avatar.symbol}
                  </span>
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle
                      cx="12"
                      cy="8"
                      r="4"
                    />
                    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                  </svg>
                )}

                {incomingFriendRequestCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold leading-5 text-white"
                  >
                    {incomingFriendRequestCount > 99
                      ? '99+'
                      : incomingFriendRequestCount}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-xl"
                >
                  <NavLink
                    role="menuitem"
                    to="/profile"
                    onClick={closeMenu}
                    className={menuItemClasses}
                  >
                    {t('nav.profile')}
                  </NavLink>

                  <NavLink
                    role="menuitem"
                    to="/friends"
                    onClick={closeMenu}
                    className={menuItemClasses}
                  >
                    <span>{t('nav.friends')}</span>

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

                  <NavLink
                    role="menuitem"
                    to="/profile/account"
                    onClick={closeMenu}
                    className={menuItemClasses}
                  >
                    {t('profile.accountSettings')}
                  </NavLink>

                  <div className="my-2 border-t border-zinc-800" />

                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`${menuItemClasses} cursor-pointer disabled:cursor-wait disabled:opacity-60`}
                  >
                    {isLoggingOut
                      ? t('nav.loggingOut')
                      : t('nav.logout')}
                  </button>

                  {logoutError && (
                    <p
                      role="alert"
                      className="px-3 py-2 text-xs text-red-300"
                    >
                      {t('nav.logoutError')}
                    </p>
                  )}
                </div>
              )}
            </div>
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
        </nav>
      </div>
    </header>
  )
}

export default Header
