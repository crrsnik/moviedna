import ForgotPasswordForm from '../features/auth/components/ForgotPasswordForm.jsx'

function ForgotPasswordPage() {
  return (
    <section className="w-full max-w-md space-y-8" aria-labelledby="password-reset-title">
      <div className="space-y-3">
        <h1 id="password-reset-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Forgot your password?</h1>
        <p className="text-zinc-400">Enter your email to request password reset instructions.</p>
      </div>
      <ForgotPasswordForm />
    </section>
  )
}

export default ForgotPasswordPage
