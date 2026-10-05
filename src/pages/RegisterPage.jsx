import RegisterForm from '../features/auth/components/RegisterForm.jsx'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

function RegisterPage() {
  const { t } = useTranslation()

  return (
    <section className="w-full max-w-md space-y-8" aria-labelledby="register-title">
      <div className="space-y-3">
        <h1 id="register-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('auth.register.title')}
        </h1>

        <p className="text-secondary">
          {t('auth.register.subtitle')}
        </p>
      </div>

      <RegisterForm />
    </section>
  )
}

export default RegisterPage
