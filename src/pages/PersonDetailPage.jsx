import { useParams } from 'react-router-dom'

import { usePersonDetails } from '../features/catalog/hooks/usePersonDetails.js'
import { useDetailPageMetadata } from '../features/catalog/hooks/useDetailPageMetadata.js'

import DetailStatus from '../features/catalog/components/DetailStatus.jsx'
import PersonDetailHero from '../features/catalog/components/PersonDetailHero.jsx'
import PersonFilmography from '../features/catalog/components/PersonFilmography.jsx'
import PersonPhotos from '../features/catalog/components/PersonPhotos.jsx'
import MediaRow from '../features/catalog/components/MediaRow.jsx'

import { useTranslation } from '../features/localization/hooks/useTranslation.js'

export default function PersonDetailPage() {
  const { t } = useTranslation()
  const { personId } = useParams()

  const {
    data,
    loading,
    notFound,
    retry,
  } = usePersonDetails(personId)

  useDetailPageMetadata(
    personId,
    data?.name,
    t('catalog.detail.personMetadataTitle'),
  )

  if (!data) {
    return (
      <DetailStatus
        loading={loading}
        notFound={notFound}
        retry={retry}
        kind="person"
        backTo="/actors"
      />
    )
  }

  return (
    <div className="w-full min-w-0 self-start space-y-10">
      <PersonDetailHero person={data} />

      {!!data.knownFor.length && (
        <section
          aria-labelledby="person-known-for"
          className="min-w-0 space-y-5"
        >
          <h2
            id="person-known-for"
            className="text-2xl font-semibold"
          >
            {t('catalog.detail.knownFor')}
          </h2>

          <MediaRow
            items={data.knownFor}
            labelledBy="person-known-for"
          />
        </section>
      )}

      <PersonFilmography
        key={`acting:${data.id}`}
        title={t('catalog.detail.acting')}
        credits={data.actingCredits}
      />

      <PersonFilmography
        key={`crew:${data.id}`}
        title={t('catalog.detail.crew')}
        credits={data.crewCredits}
      />

      <PersonPhotos
        name={data.name}
        images={data.images}
      />
    </div>
  )
}
