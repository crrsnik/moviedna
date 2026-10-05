import { Link } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'

export default function DetailStatus({
  loading,
  notFound,
  retry,
  kind,
  backTo,
}) {
  const { t } = useTranslation()

  const keys = {
    movie: {
      loading: 'catalog.detail.movieLoading',
      notFound: 'catalog.detail.movieNotFound',
      error: 'catalog.detail.movieLoadError',
      back: 'catalog.detail.backMovies',
    },
    tv: {
      loading: 'catalog.detail.tvLoading',
      notFound: 'catalog.detail.tvNotFound',
      error: 'catalog.detail.tvLoadError',
      back: 'catalog.detail.backTv',
    },
    person: {
      loading: 'catalog.detail.personLoading',
      notFound: 'catalog.detail.personNotFound',
      error: 'catalog.detail.personLoadError',
      back: 'catalog.detail.backActors',
    },
  }

  const text = keys[kind]

  return (
    <section
      className="min-h-112 w-full self-start space-y-6"
      aria-busy={loading}
    >
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="min-h-112 animate-pulse rounded-2xl border border-border bg-surface p-8 motion-reduce:animate-none"
        >
          {t(text.loading)}
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">
            {t(
              notFound
                ? text.notFound
                : text.error,
            )}
          </h1>

          {!notFound && (
            <>
              <p role="alert">
                {t('catalog.errors.unavailable')}
              </p>

              <button
                type="button"
                onClick={retry}
                className="rounded-lg border border-border px-4 py-2 hover:bg-surface-muted focus-visible:outline-2"
              >
                {t('common.retry')}
              </button>
            </>
          )}

          <Link
            to={backTo}
            className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {t(text.back)}
          </Link>
        </>
      )}
    </section>
  )
}
