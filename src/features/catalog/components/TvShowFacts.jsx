import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { PersonNames } from './PersonLink.jsx'

export default function TvShowFacts({ series }) {
  const { t } = useTranslation()

  const names = items => (
    items
      .map(item => item.name)
      .join(', ')
  )

  const facts = [
    [
      t('catalog.detail.originalName'),
      series.originalName,
    ],
    [
      t('catalog.detail.creators'),
      series.creators.length > 0 && (
        <PersonNames
          key="creators"
          people={series.creators}
        />
      ),
    ],
    [
      t('catalog.detail.status'),
      series.status,
    ],
    [
      t('catalog.detail.type'),
      series.type,
    ],
    [
      t('catalog.detail.originalLanguage'),
      series.originalLanguage,
    ],
    [
      t('catalog.detail.originCountries'),
      series.originCountries.join(', '),
    ],
    [
      t('catalog.detail.networks'),
      names(series.networks),
    ],
    [
      t('catalog.detail.productionCompanies'),
      names(series.productionCompanies),
    ],
    [
      t('catalog.detail.seasons'),
      series.numberOfSeasons,
    ],
    [
      t('catalog.detail.episodes'),
      series.numberOfEpisodes,
    ],
  ].filter(([, value]) => value)

  if (!facts.length && !series.homepage) {
    return null
  }

  return (
    <section
      aria-labelledby="tv-facts"
      className="space-y-5"
    >
      <h2
        id="tv-facts"
        className="text-2xl font-semibold"
      >
        {t('catalog.detail.aboutTv')}
      </h2>

      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0"
          >
            <dt className="text-sm text-zinc-400">
              {label}
            </dt>

            <dd className="mt-1 break-words">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {series.homepage && (
        <a
          href={series.homepage}
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
