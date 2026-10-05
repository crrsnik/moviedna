import { useTranslation } from '../../localization/hooks/useTranslation.js'

function AuthLoadingScreen() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-svh items-center justify-center bg-app p-6 text-primary">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3"
      >
        <span
          aria-hidden="true"
          className="size-5 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin"
        />

        <span>
          {t('auth.loadingMovieDna')}
        </span>
      </div>
    </main>
  )
}

export default AuthLoadingScreen
