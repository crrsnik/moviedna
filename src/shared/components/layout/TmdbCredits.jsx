import {
  useTranslation,
} from '../../../features/localization/hooks/useTranslation.js'
import { TMDB_WEBSITE_URL } from '../../config/tmdb.js'

function TmdbCredits() {
  const { t } = useTranslation()

  return (
    <footer
      aria-label={t('tmdbCredits.ariaLabel')}
      className="border-t border-zinc-800"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 sm:px-6">
        <a
          href={TMDB_WEBSITE_URL}
          className="shrink-0 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
        >
          <img
            src="/tmdb-logo.svg"
            alt="TMDB"
            width="82"
            className="h-auto w-20"
          />
        </a>

        <p className="max-w-xl text-xs leading-relaxed text-zinc-400">
          {t('tmdbCredits.disclaimer')}
        </p>
      </div>
    </footer>
  )
}

export default TmdbCredits
