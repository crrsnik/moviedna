import LoginForm from '../features/auth/components/LoginForm.jsx'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

function LoginPage() {
  const { t } = useTranslation()

  return (
    <section className="w-full max-w-md space-y-8" aria-labelledby="login-title">
      <div className="space-y-3">
        <h1 id="login-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('auth.login.title')}
        </h1>

        <p className="text-secondary">
          {t('auth.login.subtitle')}
        </p>
      </div>

      <LoginForm />
    </section>
  )
}

export default LoginPage
