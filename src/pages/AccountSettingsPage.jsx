import { useRef, useState } from 'react'

import { useAuth } from '../features/auth/hooks/useAuth.js'
import { getPasswordResetErrorMessage } from '../features/auth/services/passwordResetErrors.js'
import { requestPasswordReset } from '../features/auth/services/passwordResetService.js'

export default function AccountSettingsPage() {
  const { user } = useAuth()
  const email = typeof user?.email === 'string'
    ? user.email
    : ''

  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const pending = useRef(false)

  async function handlePasswordReset() {
    if (pending.current || isSending || !email) return

    pending.current = true
    setIsSending(true)
    setError(null)
    setSuccess(null)

    try {
      await requestPasswordReset(email)
      setSuccess(
        'Password reset instructions have been sent to your email.',
      )
    } catch (resetError) {
      setError(getPasswordResetErrorMessage(resetError))
    } finally {
      pending.current = false
      setIsSending(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">
          Account settings
        </h2>

        <p className="mt-2 text-zinc-400">
          Manage your sign-in email and password.
        </p>
      </header>

      <div className="space-y-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              Email
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              This email is used to sign in to your MovieDNA account.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="account-email"
              className="block text-sm font-medium text-zinc-200"
            >
              Email address
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
              Email changes are not supported yet.
            </p>
          </div>
        </section>

        <section className="space-y-4 border-t border-zinc-800 pt-8">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              Password
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Send a secure password reset link to your account email.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isSending || !email}
            className="rounded-md border border-zinc-600 px-4 py-2 font-medium text-zinc-100 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending
              ? 'Sending…'
              : 'Send password reset email'}
          </button>

          {!email && (
            <p role="alert" className="text-sm text-red-300">
              No email address is available for this account.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="text-sm text-zinc-300">
              {success}
            </p>
          )}
        </section>
      </div>
    </section>
  )
}
