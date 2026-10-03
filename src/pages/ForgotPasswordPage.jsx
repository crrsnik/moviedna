import ForgotPasswordForm from '../features/auth/components/ForgotPasswordForm.jsx'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

function ForgotPasswordPage() {
  const { t } = useTranslation()

  return (
    <section className="w-full max-w-md space-y-8" aria-labelledby="password-reset-title">
      <div className="space-y-3">
        <h1 id="password-reset-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('auth.passwordReset.title')}
        </h1>

        <p className="text-zinc-400">
          {t('auth.passwordReset.subtitle')}
        </p>
      </div>

      <ForgotPasswordForm />
    </section>
  )
}

export default ForgotPasswordPage
