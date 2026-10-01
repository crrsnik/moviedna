import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../services/loginService.js'
import { getLoginErrorMessage } from '../services/loginErrors.js'
import { validateLogin } from '../validation/loginValidation.js'

const fields = [
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
]

function LoginForm() {
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(false)
  const formRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return
    const result = validateLogin(values)
    setErrors(result.errors)
    setServerError(null)
    if (Object.keys(result.errors).length) {
      formRef.current?.elements.namedItem(Object.keys(result.errors)[0])?.focus()
      return
    }

    pending.current = true
    setIsSubmitting(true)
    try {
      await loginUser(result.values)
    } catch (error) {
      if (mounted.current) setServerError(getLoginErrorMessage(error))
      return
    } finally {
      pending.current = false
      if (mounted.current) setIsSubmitting(false)
    }
    // The existing Auth subscription may already have redirected GuestOnlyRoute.
    if (mounted.current) navigate('/', { replace: true })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-5">
      <fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
        <legend className="sr-only">Sign-in details</legend>
        {fields.map(({ name, label, ...inputProps }) => {
          const id = `login-${name}`
          return (
            <div key={name} className="space-y-2">
              <label htmlFor={id} className="block text-sm font-medium text-zinc-200">{label}</label>
              <input
                {...inputProps}
                id={id}
                name={name}
                value={values[name]}
                onChange={handleChange}
                required
                aria-invalid={Boolean(errors[name])}
                aria-describedby={errors[name] ? `${id}-error` : undefined}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 aria-invalid:border-red-400"
              />
              {errors[name] && <p id={`${id}-error`} className="text-sm text-red-300">{errors[name]}</p>}
            </div>
          )
        })}
      </fieldset>
      <p className="text-right text-sm">
        <Link to="/forgot-password" className="rounded text-zinc-100 underline underline-offset-4 hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100">Forgot password?</Link>
      </p>
      {serverError && <p role="alert" className="text-sm text-red-300">{serverError}</p>}
      <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-zinc-100 px-4 py-3 font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:cursor-wait disabled:opacity-60">
        {isSubmitting ? 'Signing in…' : 'Log in'}
      </button>
      <p className="text-center text-sm text-zinc-400">
        New to MovieDNA?{' '}
        <Link to="/register" className="rounded text-zinc-100 underline underline-offset-4 hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100">Create an account</Link>
      </p>
    </form>
  )
}

export default LoginForm
