import LoginForm from '../features/auth/components/LoginForm.jsx'

function LoginPage() {
  return (
    <section className="w-full max-w-md space-y-8" aria-labelledby="login-title">
      <div className="space-y-3">
        <h1 id="login-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Log in to MovieDNA</h1>
        <p className="text-zinc-400">Welcome back. Sign in with your email and password.</p>
      </div>
      <LoginForm />
    </section>
  )
}

export default LoginPage
