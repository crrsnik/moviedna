import {
  useTranslation,
} from '../../../features/localization/hooks/useTranslation.js'
import { TMDB_WEBSITE_URL } from '../../config/tmdb.js'

function TmdbCredits() {
  const { t } = useTranslation()

  return (
    <footer
      aria-label={t('tmdbCredits.ariaLabel')}
      className="border-t border-border bg-surface/40"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 sm:px-6">
        <a
          href={TMDB_WEBSITE_URL}
          className="shrink-0 rounded opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <img
            src="/tmdb-logo.svg"
            alt="TMDB"
            width="82"
            className="h-auto w-20"
          />
        </a>

        <p className="max-w-xl text-xs leading-relaxed text-secondary">
          {t('tmdbCredits.disclaimer')}
        </p>
      </div>
    </footer>
  )
}

export default TmdbCredits
