import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../services/passwordResetService.js'
import { getPasswordResetErrorMessage, PASSWORD_RESET_SUCCESS_MESSAGE } from '../services/passwordResetErrors.js'
import { validatePasswordReset } from '../validation/passwordResetValidation.js'

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(false)
  const emailRef = useRef(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current || isSuccess) return
    const result = validatePasswordReset({ email })
    setEmailError(result.errors.email || null)
    setServerError(null)
    if (result.errors.email) {
      emailRef.current?.focus()
      return
    }

    pending.current = true
    setIsSubmitting(true)
    try {
      await requestPasswordReset(result.values.email)
      if (mounted.current) setIsSuccess(true)
    } catch (error) {
      if (mounted.current) setServerError(getPasswordResetErrorMessage(error))
    } finally {
      pending.current = false
      if (mounted.current) setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {isSuccess ? (
        <p role="status" aria-live="polite" className="rounded-md border border-zinc-700 bg-zinc-900 p-4 text-zinc-200">
          {PASSWORD_RESET_SUCCESS_MESSAGE}
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="password-reset-email" className="block text-sm font-medium text-zinc-200">Email</label>
            <input
              ref={emailRef}
              id="password-reset-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setEmailError(null) }}
              required
              disabled={isSubmitting}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'password-reset-email-error' : undefined}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 disabled:opacity-70 aria-invalid:border-red-400"
            />
            {emailError && <p id="password-reset-email-error" className="text-sm text-red-300">{emailError}</p>}
          </div>
          {serverError && <p role="alert" className="text-sm text-red-300">{serverError}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-zinc-100 px-4 py-3 font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:cursor-wait disabled:opacity-60">
            {isSubmitting ? 'Sending…' : 'Send reset instructions'}
          </button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link to="/login" className="rounded text-zinc-100 underline underline-offset-4 hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100">Back to log in</Link>
      </p>
    </div>
  )
}

export default ForgotPasswordForm
