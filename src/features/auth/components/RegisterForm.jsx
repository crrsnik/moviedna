import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { registerUser } from '../services/registrationService.js'
import { getRegistrationErrorMessage } from '../services/registrationErrors.js'
import { normalizeUsername, validateRegistration } from '../validation/registrationValidation.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { translateAuthMessage } from '../../localization/core/authUiMessages.js'

const fields = [
  { name: 'username', labelKey: 'auth.fields.username', type: 'text', autoComplete: 'username', maxLength: 20 },
  { name: 'displayName', labelKey: 'auth.fields.displayName', type: 'text', autoComplete: 'name', maxLength: 50 },
  { name: 'email', labelKey: 'auth.fields.email', type: 'email', autoComplete: 'email', maxLength: 254 },
  { name: 'password', labelKey: 'auth.fields.password', type: 'password', autoComplete: 'new-password', maxLength: 128 },
  { name: 'confirmPassword', labelKey: 'auth.fields.confirmPassword', type: 'password', autoComplete: 'new-password', maxLength: 128 },
]

function RegisterForm() {
  const { t } = useTranslation()
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
      setRegistrationStatus((status) => (
        status === 'rollback-failed'
          ? 'idle'
          : status
      ))
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
    // Keep a distinct success state until OnboardingPage has actually mounted.
    // GuestOnlyRoute can therefore never race this first-run navigation to "/".
    if (mounted.current) {
      setRegistrationStatus('succeeded')
      navigate('/onboarding', { replace: true })
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-5">
      <fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
        <legend className="sr-only">{t('auth.register.legend')}</legend>
        {fields.map(({ name, labelKey, ...inputProps }) => {
          const id = `register-${name}`
          const description = [name === 'username' && 'username-hint', errors[name] && `${id}-error`].filter(Boolean).join(' ')
          return (
            <div key={name} className="space-y-2">
              <label htmlFor={id} className="block text-sm font-medium text-primary">{t(labelKey)}</label>
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
                className="w-full rounded-md border border-border bg-surface-muted px-3 py-2 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-red-400"
              />
              {name === 'username' && <p id="username-hint" className="text-sm text-secondary">{t('auth.register.usernameHint')}</p>}
              {errors[name] && <p id={`${id}-error`} className="text-sm text-red-300">{translateAuthMessage(t, errors[name])}</p>}
            </div>
          )
        })}
      </fieldset>
      {serverError && <p role="alert" className="text-sm text-red-300">{translateAuthMessage(t, serverError)}</p>}
      <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-accent px-4 py-3 font-semibold text-accent-contrast hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60">
        {isSubmitting ? t('auth.register.submitting') : t('auth.register.submit')}
      </button>
      <p className="text-center text-sm text-secondary">
        {t('auth.register.alreadyHaveAccount')}{' '}
        <Link to="/login" className="rounded text-primary underline underline-offset-4 hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">{t('auth.register.login')}</Link>
      </p>
    </form>
  )
}

export default RegisterForm
