import { useTranslation } from '../../localization/hooks/useTranslation.js'

function AuthLoadingScreen() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-svh items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3"
      >
        <span
          aria-hidden="true"
          className="size-5 rounded-full border-2 border-zinc-700 border-t-zinc-100 motion-safe:animate-spin"
        />

        <span>
          {t('auth.loadingMovieDna')}
        </span>
      </div>
    </main>
  )
}

export default AuthLoadingScreen
