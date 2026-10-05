import {
  useRef,
  useState,
} from 'react'

import {
  useAuth,
} from '../features/auth/hooks/useAuth.js'
import {
  accountDeletionService,
} from '../features/auth/services/accountDeletionService.js'
import {
  getPasswordResetErrorMessage,
} from '../features/auth/services/passwordResetErrors.js'
import {
  requestPasswordReset,
} from '../features/auth/services/passwordResetService.js'
import {
  translateAuthMessage,
} from '../features/localization/core/authUiMessages.js'
import {
  useTranslation,
} from '../features/localization/hooks/useTranslation.js'

const DELETE_ERROR_KEYS = {
  'password-required':
    'accountSettingsPage.deletePasswordRequired',

  'wrong-password':
    'accountSettingsPage.deleteWrongPassword',

  'too-many-requests':
    'accountSettingsPage.deleteTooManyRequests',

  unavailable:
    'accountSettingsPage.deleteUnavailable',

  'recent-login-required':
    'accountSettingsPage.deleteRecentLogin',

  unauthenticated:
    'accountSettingsPage.deleteUnauthenticated',

  unknown:
    'accountSettingsPage.deleteError',
}

export default function AccountSettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const email = typeof user?.email === 'string'
    ? user.email
    : ''

  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const pending = useRef(false)

  const [
    deletePassword,
    setDeletePassword,
  ] = useState('')

  const [
    deleteConfirmed,
    setDeleteConfirmed,
  ] = useState(false)

  const [
    deleteError,
    setDeleteError,
  ] = useState(null)

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false)

  const deletePending = useRef(false)

  async function handlePasswordReset() {
    if (
      pending.current
      || isSending
      || !email
    ) {
      return
    }

    pending.current = true
    setIsSending(true)
    setError(null)
    setSuccess(false)

    try {
      await requestPasswordReset(email)
      setSuccess(true)
    } catch (resetError) {
      setError(
        getPasswordResetErrorMessage(
          resetError,
        ),
      )
    } finally {
      pending.current = false
      setIsSending(false)
    }
  }

  async function handleDeleteAccount(event) {
    event.preventDefault()

    if (
      deletePending.current
      || isDeleting
      || !deleteConfirmed
    ) {
      return
    }

    deletePending.current = true
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await accountDeletionService
        .deleteAccount(
          deletePassword,
        )

      /*
       * Successful deletion signs the local Firebase
       * session out. ProtectedRoute takes over from here.
       */
    } catch (deletionError) {
      const key = (
        DELETE_ERROR_KEYS[
          deletionError?.code
        ]
        ?? DELETE_ERROR_KEYS.unknown
      )

      setDeleteError(
        t(key),
      )

      deletePending.current = false
      setIsDeleting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">
          {t('accountSettingsPage.title')}
        </h2>

        <p className="mt-2 text-secondary">
          {t(
            'accountSettingsPage.description',
          )}
        </p>
      </header>

      <div className="space-y-8 rounded-xl border border-border bg-surface p-5 sm:p-7">
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {t(
                'accountSettingsPage.emailTitle',
              )}
            </h3>

            <p className="mt-1 text-sm text-secondary">
              {t(
                'accountSettingsPage.emailDescription',
              )}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="account-email"
              className="block text-sm font-medium text-primary"
            >
              {t(
                'accountSettingsPage.emailAddress',
              )}
            </label>

            <input
              id="account-email"
              type="email"
              value={email}
              readOnly
              autoComplete="email"
              className="w-full rounded-md border border-border bg-surface-muted px-3 py-2 text-secondary"
            />

            <p className="text-sm text-tertiary">
              {t(
                'accountSettingsPage.emailUnsupported',
              )}
            </p>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {t(
                'accountSettingsPage.passwordTitle',
              )}
            </h3>

            <p className="mt-1 text-sm text-secondary">
              {t(
                'accountSettingsPage.passwordDescription',
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isSending || !email}
            className="rounded-md border border-border-strong px-4 py-2 font-medium text-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending
              ? t('accountSettingsPage.sending')
              : t('accountSettingsPage.sendReset')}
          </button>

          {!email && (
            <p
              role="alert"
              className="text-sm text-red-300"
            >
              {t(
                'accountSettingsPage.missingEmail',
              )}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="text-sm text-red-300"
            >
              {translateAuthMessage(
                t,
                error,
              )}
            </p>
          )}

          {success && (
            <p
              role="status"
              className="text-sm text-secondary"
            >
              {t(
                'accountSettingsPage.resetSuccess',
              )}
            </p>
          )}
        </section>

        <section className="space-y-5 border-t border-red-950 pt-8">
          <div>
            <h3 className="text-lg font-semibold text-red-300">
              {t(
                'accountSettingsPage.deleteTitle',
              )}
            </h3>

            <p className="mt-1 text-sm text-secondary">
              {t(
                'accountSettingsPage.deleteDescription',
              )}
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={handleDeleteAccount}
          >
            <div className="space-y-2">
              <label
                htmlFor="delete-account-password"
                className="block text-sm font-medium text-primary"
              >
                {t(
                  'accountSettingsPage.deletePassword',
                )}
              </label>

              <input
                id="delete-account-password"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                disabled={isDeleting}
                onChange={event => {
                  setDeletePassword(
                    event.target.value,
                  )
                }}
                className="w-full rounded-md border border-border bg-surface-muted px-3 py-2 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:opacity-50"
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-secondary">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                disabled={isDeleting}
                onChange={event => {
                  setDeleteConfirmed(
                    event.target.checked,
                  )
                }}
                className="mt-1"
              />

              <span>
                {t(
                  'accountSettingsPage.deleteConfirmation',
                )}
              </span>
            </label>

            {deleteError && (
              <p
                role="alert"
                className="text-sm text-red-300"
              >
                {deleteError}
              </p>
            )}

            <button
              type="submit"
              disabled={
                isDeleting
                || !deleteConfirmed
                || !deletePassword
              }
              className="rounded-md border border-red-700 bg-red-950 px-4 py-2 font-semibold text-red-200 hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting
                ? t(
                    'accountSettingsPage.deleting',
                  )
                : t(
                    'accountSettingsPage.deleteButton',
                  )}
            </button>
          </form>
        </section>
      </div>
    </section>
  )
}
