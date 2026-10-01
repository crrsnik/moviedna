import { useRef, useState } from 'react'

import { useAuth } from '../features/auth/hooks/useAuth.js'
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

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">
          {t('accountSettingsPage.title')}
        </h2>

        <p className="mt-2 text-zinc-400">
          {t('accountSettingsPage.description')}
        </p>
      </header>

      <div className="space-y-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              {t('accountSettingsPage.emailTitle')}
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              {t(
                'accountSettingsPage.emailDescription',
              )}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="account-email"
              className="block text-sm font-medium text-zinc-200"
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
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-300"
            />

            <p className="text-sm text-zinc-500">
              {t(
                'accountSettingsPage.emailUnsupported',
              )}
            </p>
          </div>
        </section>

        <section className="space-y-4 border-t border-zinc-800 pt-8">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              {t(
                'accountSettingsPage.passwordTitle',
              )}
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              {t(
                'accountSettingsPage.passwordDescription',
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isSending || !email}
            className="rounded-md border border-zinc-600 px-4 py-2 font-medium text-zinc-100 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
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
              {translateAuthMessage(t, error)}
            </p>
          )}

          {success && (
            <p
              role="status"
              className="text-sm text-zinc-300"
            >
              {t(
                'accountSettingsPage.resetSuccess',
              )}
            </p>
          )}
        </section>
      </div>
    </section>
  )
}
