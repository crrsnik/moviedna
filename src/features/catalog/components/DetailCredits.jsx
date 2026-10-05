import { useTranslation } from '../../localization/hooks/useTranslation.js'

import PersonLink from './PersonLink.jsx'
import { getTmdbProfileUrl } from '../services/tmdbImages.js'
import DetailImage from './DetailImage.jsx'

export default function DetailCredits({
  cast,
  headingId,
}) {
  const { t } = useTranslation()

  if (!cast.length) return null

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-5"
    >
      <h2
        id={headingId}
        className="text-2xl font-semibold"
      >
        {t('catalog.detail.cast')}
      </h2>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cast.map(person => (
          <li
            key={person.id}
            className="min-w-0 space-y-2"
          >
            <PersonLink
              person={person}
              className="block space-y-2"
            >
              <DetailImage
                src={getTmdbProfileUrl(
                  person.profilePath,
                )}
                alt={person.name}
                placeholder={t(
                  'catalog.detail.noPhoto',
                )}
                className="aspect-2/3 rounded-lg"
              />

              <p className="break-words text-sm font-medium">
                {person.name}
              </p>

              {person.character && (
                <p className="break-words text-xs text-secondary">
                  {person.character}
                </p>
              )}

              {person.episodeCount > 0 && (
                <p className="text-xs text-secondary">
                  {t(
                    'catalog.detail.episodesCount',
                    {
                      count:
                        person.episodeCount,
                    },
                  )}
                </p>
              )}
            </PersonLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
