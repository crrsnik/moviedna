import { Link } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'

import {
  getTmdbBackdropUrl,
  getTmdbPosterUrl,
} from '../services/tmdbImages.js'

import DetailImage from './DetailImage.jsx'

const link = 'inline-block rounded-lg border border-border-strong bg-black/55 px-4 py-2 text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'

export default function DetailHero({
  media: movie,
  metadata,
  backTo,
  backLabel,
  actions = null,
}) {
  const { locale, t } = useTranslation()

  return (
    <header className="relative isolate min-h-112 overflow-hidden rounded-2xl border border-border bg-surface">
      <DetailImage
        src={getTmdbBackdropUrl(movie.backdropPath)}
        alt=""
        placeholder=""
        lazy={false}
        className="absolute inset-0 -z-20"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-black/75"
      />

      <div className="grid min-w-0 gap-6 p-5 sm:p-8 md:grid-cols-[15rem_minmax(0,1fr)]">
        <DetailImage
          src={getTmdbPosterUrl(
            movie.posterPath,
            'w500',
          )}
          alt={t(
            'catalog.media.posterAlt',
            { title: movie.title },
          )}
          placeholder={t(
            'catalog.detail.noPoster',
          )}
          lazy={false}
          className="mx-auto aspect-2/3 w-full max-w-60 rounded-lg"
        />

        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="min-w-0 break-words text-3xl font-semibold sm:text-4xl">
            {movie.title}
          </h1>

            {actions && (
              <div className="shrink-0">
                {actions}
              </div>
            )}
          </div>

          <p className="flex flex-wrap gap-3 text-sm text-secondary">
            {metadata
              .filter(Boolean)
              .map((value, index) => (
                <span key={index}>
                  {value}
                </span>
              ))}
          </p>

          {movie.voteAverage !== null
            && movie.voteCount > 0 && (
              <p className="text-sm">
                {t(
                  'catalog.detail.tmdbRating',
                  {
                    rating:
                      movie.voteAverage.toFixed(1),
                    votes:
                      movie.voteCount.toLocaleString(
                        locale,
                      ),
                  },
                )}
              </p>
          )}

          {!!movie.genres.length && (
            <ul
              aria-label={t(
                'catalog.detail.genres',
              )}
              className="flex flex-wrap gap-2"
            >
              {movie.genres.map(genre => (
                <li
                  key={genre.id}
                  className="rounded-full bg-surface-muted px-3 py-1 text-xs"
                >
                  {genre.name}
                </li>
              ))}
            </ul>
          )}

          {movie.tagline && (
            <p className="break-words italic text-secondary">
              {movie.tagline}
            </p>
          )}

          <p className="break-words leading-relaxed text-primary">
            {movie.overview
              || t('catalog.detail.noOverview')}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {movie.trailer && (
              <a
                href={movie.trailer.url}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                {t('catalog.detail.watchTrailer')}
              </a>
            )}

            <Link
              to={backTo}
              className={link}
            >
              {backLabel}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
