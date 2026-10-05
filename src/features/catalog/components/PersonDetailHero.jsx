import { Link } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'

import DetailImage from './DetailImage.jsx'
import { getTmdbProfileUrl } from '../services/tmdbImages.js'
import PersonExternalLinks from './PersonExternalLinks.jsx'

export default function PersonDetailHero({
  person,
}) {
  const { t } = useTranslation()

  const facts = [
    [
      t('catalog.detail.knownForDepartment'),
      person.knownForDepartment,
    ],
    [
      t('catalog.detail.born'),
      person.birthday,
    ],
    [
      t('catalog.detail.died'),
      person.deathday,
    ],
    [
      t('catalog.detail.placeOfBirth'),
      person.placeOfBirth,
    ],
    [
      t('catalog.detail.gender'),
      person.genderLabel,
    ],
  ].filter(([, value]) => value)

  return (
    <header className="grid min-w-0 gap-6 rounded-2xl border border-border bg-surface p-5 sm:p-8 md:grid-cols-[15rem_minmax(0,1fr)]">
      <DetailImage
        src={getTmdbProfileUrl(
          person.profilePath,
          'h632',
        )}
        alt={person.name}
        placeholder={t(
          'catalog.detail.noPhoto',
        )}
        lazy={false}
        className="mx-auto aspect-2/3 w-full max-w-60 self-start rounded-lg"
      />

      <div className="min-w-0 space-y-5">
        <h1 className="break-words text-3xl font-semibold sm:text-4xl">
          {person.name}
        </h1>

        <dl className="grid gap-3 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div
              key={label}
              className="min-w-0"
            >
              <dt className="text-sm text-secondary">
                {label}
              </dt>

              <dd className="break-words">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="whitespace-pre-line break-words leading-relaxed text-primary">
          {person.biography
            || t('catalog.detail.noBiography')}
        </p>

        {!!person.alsoKnownAs.length && (
          <p className="break-words text-sm text-secondary">
            {t(
              'catalog.detail.alsoKnownAs',
              {
                names:
                  person.alsoKnownAs.join(', '),
              },
            )}
          </p>
        )}

        <PersonExternalLinks
          homepage={person.homepage}
          links={person.externalLinks}
        />

        <Link
          to="/actors"
          className="inline-block rounded-lg border border-border-strong px-4 py-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {t('catalog.detail.backActors')}
        </Link>
      </div>
    </header>
  )
}
