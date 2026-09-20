import RegisterForm from '../features/auth/components/RegisterForm.jsx'

function RegisterPage() {
  return (
    <section className="w-full max-w-md space-y-8" aria-labelledby="register-title">
      <div className="space-y-3">
        <h1 id="register-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Create your MovieDNA account</h1>
        <p className="text-zinc-400">Choose a unique username and start discovering your movie identity.</p>
      </div>
      <RegisterForm />
    </section>
  )
}

export default RegisterPage
