import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { registerUser } from '../services/registrationService.js'
import { getRegistrationErrorMessage } from '../services/registrationErrors.js'
import { normalizeUsername, validateRegistration } from '../validation/registrationValidation.js'

const fields = [
  { name: 'username', label: 'Username', type: 'text', autoComplete: 'username', maxLength: 20 },
  { name: 'displayName', label: 'Display name', type: 'text', autoComplete: 'name', maxLength: 50 },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 254 },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', maxLength: 128 },
  { name: 'confirmPassword', label: 'Confirm password', type: 'password', autoComplete: 'new-password', maxLength: 128 },
]

function RegisterForm() {
  const [values, setValues] = useState({ username: '', displayName: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const pending = useRef(false)
  const mounted = useRef(false)
  const formRef = useRef(null)
  const { registrationStatus, setRegistrationStatus } = useAuth()
  const isSubmitting = registrationStatus === 'pending'
  const navigate = useNavigate()

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      // Do not release a still-running operation if the user navigates away.
      setRegistrationStatus((status) => status === 'rollback-failed' ? 'idle' : status)
    }
  }, [setRegistrationStatus])

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: name === 'username' ? value.toLowerCase() : value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current || isSubmitting) return
    const validationErrors = validateRegistration(values)
    setErrors(validationErrors)
    setServerError(null)
    if (Object.keys(validationErrors).length) {
      formRef.current?.elements.namedItem(Object.keys(validationErrors)[0])?.focus()
      return
    }

    pending.current = true
    setRegistrationStatus('pending')
    try {
      await registerUser({
        username: values.username,
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      })
    } catch (error) {
      if (mounted.current) setServerError(getRegistrationErrorMessage(error))
      // Only keep the guest route open for an incomplete session that could not
      // be signed out. Ordinary failures restore the normal authenticated guard.
      setRegistrationStatus(mounted.current && error?.code === 'registration/rollback-signout-failed' ? 'rollback-failed' : 'idle')
      return
    } finally {
      pending.current = false
    }
    // Navigation is outside the registration error handler: the account is complete.
    if (mounted.current) navigate('/', { replace: true })
    setRegistrationStatus('idle')
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-5">
      <fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
        <legend className="sr-only">Registration details</legend>
        {fields.map(({ name, label, ...inputProps }) => {
          const id = `register-${name}`
          const description = [name === 'username' && 'username-hint', errors[name] && `${id}-error`].filter(Boolean).join(' ')
          return (
            <div key={name} className="space-y-2">
              <label htmlFor={id} className="block text-sm font-medium text-zinc-200">{label}</label>
              <input
                {...inputProps}
                id={id}
                name={name}
                value={values[name]}
                onChange={handleChange}
                onBlur={name === 'username' ? () => setValues((current) => ({ ...current, username: normalizeUsername(current.username) })) : undefined}
                required
                aria-invalid={Boolean(errors[name])}
                aria-describedby={description || undefined}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 aria-invalid:border-red-400"
              />
              {name === 'username' && <p id="username-hint" className="text-sm text-zinc-400">3–20 lowercase letters, numbers, or underscores.</p>}
              {errors[name] && <p id={`${id}-error`} className="text-sm text-red-300">{errors[name]}</p>}
            </div>
          )
        })}
      </fieldset>
      {serverError && <p role="alert" className="text-sm text-red-300">{serverError}</p>}
      <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-zinc-100 px-4 py-3 font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:cursor-wait disabled:opacity-60">
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link to="/login" className="rounded text-zinc-100 underline underline-offset-4 hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100">Log in</Link>
      </p>
    </form>
  )
}

export default RegisterForm
