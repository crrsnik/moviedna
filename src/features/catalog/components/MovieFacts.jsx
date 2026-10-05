import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { PersonNames } from './PersonLink.jsx'
import { formatMoney } from '../services/normalizeMovieDetails.js'

export default function MovieFacts({ movie }) {
  const { t } = useTranslation()

  const names = items => (
    items
      .map(item => item.name)
      .join(', ')
  )

  const facts = [
    [
      t('catalog.detail.originalTitle'),
      movie.originalTitle,
    ],
    [
      t('catalog.detail.directors'),
      movie.directors.length > 0 && (
        <PersonNames
          key="directors"
          people={movie.directors}
        />
      ),
    ],
    [
      t('catalog.detail.writers'),
      movie.writers.length > 0 && (
        <PersonNames
          key="writers"
          people={movie.writers}
        />
      ),
    ],
    [
      t('catalog.detail.status'),
      movie.status,
    ],
    [
      t('catalog.detail.originalLanguage'),
      movie.originalLanguage,
    ],
    [
      t('catalog.detail.productionCountries'),
      names(movie.productionCountries),
    ],
    [
      t('catalog.detail.productionCompanies'),
      names(movie.productionCompanies),
    ],
    [
      t('catalog.detail.budget'),
      formatMoney(movie.budget),
    ],
    [
      t('catalog.detail.revenue'),
      formatMoney(movie.revenue),
    ],
  ].filter(([, value]) => value)

  if (!facts.length && !movie.homepage) {
    return null
  }

  return (
    <section
      aria-labelledby="movie-facts"
      className="space-y-5"
    >
      <h2
        id="movie-facts"
        className="text-2xl font-semibold"
      >
        {t('catalog.detail.aboutMovie')}
      </h2>

      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0"
          >
            <dt className="text-sm text-secondary">
              {label}
            </dt>

            <dd className="mt-1 break-words">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {movie.homepage && (
        <a
          href={movie.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {t('catalog.detail.officialWebsite')}
        </a>
      )}
    </section>
  )
}
